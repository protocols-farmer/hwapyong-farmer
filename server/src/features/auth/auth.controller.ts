//src/features/auth/auth.controller.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "node:stream/consumers";
import crypto from "node:crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { authService } from "./auth.service.js";
import { redisClient } from "../../db/redis.js";
import type {
  SignupDTO,
  LoginDTO,
  ChangePasswordDTO,
  UpdateAccountDTO,
  User,
  JWTPayload,
} from "./auth.types.js";
import { mediaStorage } from "../../db/cloudinary.js";
import busboy from "busboy";
import { verifyAccessToken } from "./verifyAccessToken.js";
import { invalidateUserAccessTokens } from "./sessionInvalidation.js";

const ACCESS_TOKEN_SECRET = process.env["ACCESS_TOKEN_SECRET"];
const ACCESS_TOKEN_EXPIRY_MINUTES = parseInt(
  process.env["ACCESS_TOKEN_EXPIRY_MINUTES"] || "15",
  10,
);
const REFRESH_TOKEN_EXPIRY_MINUTES = parseInt(
  process.env["REFRESH_TOKEN_EXPIRY_MINUTES"] || "10080",
  10,
);
// #10 fix: an absolute ceiling on how long a single browser session can
// keep renewing itself via refresh-token rotation, regardless of activity.
// Without this, a session that gets used at least once every
// REFRESH_TOKEN_EXPIRY_MINUTES window rotates forever and never forces a
// fresh login.
const ABSOLUTE_SESSION_CEILING_DAYS = parseInt(
  process.env["ABSOLUTE_SESSION_CEILING_DAYS"] || "30",
  10,
);

if (
  !ACCESS_TOKEN_SECRET ||
  !ACCESS_TOKEN_EXPIRY_MINUTES ||
  !REFRESH_TOKEN_EXPIRY_MINUTES ||
  !ABSOLUTE_SESSION_CEILING_DAYS
) {
  process.stderr.write(
    "FATAL ERROR: ACCESS_TOKEN_SECRET OR ACCESS_TOKEN_EXPIRY_MINUTES OR REFRESH_TOKEN_EXPIRY_MINUTES is not defined.\n",
  );
  process.exit(1);
}

const rawAllowedOriginsForCsrfCheck = process.env["CLIENT_URL"];
if (!rawAllowedOriginsForCsrfCheck) {
  process.stderr.write(
    "FATAL ERROR: CLIENT_URL is not defined in environment variables.\n",
  );
  process.exit(1);
}
const allowedOriginsForCsrfCheck = rawAllowedOriginsForCsrfCheck
  .split(",")
  .map((o) => o.trim());

export const authController = {
  async banCheck(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const isDev = process.env["NODE_ENV"] === "development";
    const ip =
      String(req.headers["x-forwarded-for"] || req.socket.remoteAddress).split(
        ",",
      )[0] || "unknown_ip";

    res.setHeader("Content-Type", "application/json");
    if (isDev) {
      res.statusCode = 200;
      res.end(JSON.stringify({ banned: false, remainingSeconds: 0 }));
      return;
    }

    try {
      const remainingSeconds =
        ip !== "unknown_ip"
          ? await redisClient.ttl(`ratelimit:login:ban:ip:${ip}`)
          : 0;

      if (remainingSeconds > 0) {
        res.statusCode = 200;
        res.end(JSON.stringify({ banned: true, remainingSeconds }));
        return;
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ banned: false, remainingSeconds: 0 }));
    } catch (err) {
      process.stderr.write(
        `[banCheck] Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Failed to check ban status" }));
    }
  },

  async signup(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body: SignupDTO;
    try {
      body = (await json(req)) as SignupDTO;
    } catch (err) {
      process.stderr.write(
        `[signup] JSON Parse Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON format." }));
      return;
    }

    try {
      const username = body.username;
      const password = body.password;
      const confirmPassword = body.confirmPassword;

      if (!username || username.length < 3 || username.length > 20) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Username must be 3-20 characters." }));
        return;
      }

      const usernameCharacterAllowList = /^[a-zA-Z0-9_]+$/;
      if (!usernameCharacterAllowList.test(username)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Username can only contain letters, numbers, and underscores.",
          }),
        );
        return;
      }

      if (!password || password.length < 6 || password.length > 50) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Password must be 6-50 characters." }));
        return;
      }

      if (password !== confirmPassword) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Passwords do not match." }));
        return;
      }

      let passwordHash: string;
      try {
        passwordHash = await argon2.hash(password);
      } catch (hashErr) {
        process.stderr.write(
          `[signup] Argon2 hash failed for username=${username}: ${(hashErr as Error).message}\nStack: ${(hashErr as Error).stack}\n`,
        );
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Password hashing failed on the server. This is a server-side bug — please report it.",
          }),
        );
        return;
      }

      const result = await authService.signup(username, passwordHash);
      const newUser = result.rows[0] as User;

      const rawRefreshToken = crypto.randomBytes(64).toString("hex");
      const hashedRefreshToken = crypto
        .createHash("sha256")
        .update(rawRefreshToken)
        .digest("hex");

      const refreshExpiresAt = new Date(
        Date.now() + REFRESH_TOKEN_EXPIRY_MINUTES * 60 * 1000,
      );
      const ip =
        String(
          req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        ).split(",")[0] || "unknown_ip";
      const userAgent = req.headers["user-agent"] || "unknown";

      await authService.createRefreshToken(
        newUser.id,
        hashedRefreshToken,
        refreshExpiresAt,
        userAgent,
        ip,
        null,
      );

      const payload: JWTPayload = {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        token_use: "access",
      };
      const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET as string, {
        expiresIn: `${ACCESS_TOKEN_EXPIRY_MINUTES}m`,
      });

      const isProd = process.env["NODE_ENV"] !== "development";
      const maxAgeSeconds = REFRESH_TOKEN_EXPIRY_MINUTES * 60;
      const cookieHeader = `refreshToken=${rawRefreshToken}; HttpOnly; ${isProd ? "SameSite=None; Secure;" : "SameSite=Lax;"} Path=/; Max-Age=${maxAgeSeconds}`;

      res.statusCode = 201;
      res.setHeader("Set-Cookie", cookieHeader);
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: "User created",

          user: {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role,
            profile_title: newUser.profile_title,
            avatar_url: newUser.avatar_url,
          },
          accessToken,
        }),
      );
      return;
    } catch (err) {
      const pgCode = (err as any)?.code;
      const pgConstraint = (err as any)?.constraint || "";
      if (pgCode === "23505") {
        process.stderr.write(
          `[signup] Duplicate username rejected (23505) constraint=${pgConstraint} username=${(err as any)?.detail || "n/a"}\n`,
        );
        res.statusCode = 409;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Username already taken. Pick a different one.",
            field: "username",
            code: "USERNAME_TAKEN",
          }),
        );
        return;
      }

      process.stderr.write(
        `[signup] DB/Logic Error code=${pgCode || "n/a"} constraint=${pgConstraint || "n/a"}: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error:
            "Signup failed due to a server error. Please try again — if it keeps happening, contact the administrator.",
        }),
      );
      return;
    }
  },

  async login(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const isDev = process.env["NODE_ENV"] === "development";
    const ip =
      String(req.headers["x-forwarded-for"] || req.socket.remoteAddress).split(
        ",",
      )[0] || "unknown_ip";

    let body: LoginDTO;
    try {
      body = (await json(req)) as LoginDTO;
    } catch (err) {
      process.stderr.write(
        `[login] JSON Parse Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON format." }));
      return;
    }

    const username = body.username || "";

    if (!isDev) {
      try {
        const ipBan =
          ip !== "unknown_ip"
            ? await redisClient.ttl(`ratelimit:login:ban:ip:${ip}`)
            : 0;

        if (ipBan > 0) {
          res.statusCode = 429;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Retry-After", String(ipBan));
          res.end(
            JSON.stringify({
              error: "Too many attempts. You are temporarily banned.",
              remainingSeconds: ipBan,
            }),
          );
          return;
        }
      } catch (err) {
        process.stderr.write(
          `[login] Rate limiter check error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
        );
      }
    }

    const recordFailure = async () => {
      let isBanned = false;
      let maxBanTime = 0;

      if (isDev) return { isBanned, maxBanTime };
      try {
        if (ip !== "unknown_ip") {
          const ipFailCount = await redisClient.incr(
            `ratelimit:login:fail:ip:${ip}`,
          );
          if (ipFailCount === 1)
            await redisClient.expire(`ratelimit:login:fail:ip:${ip}`, 86400);
          if (ipFailCount >= 5) {
            let banTime = 900;
            if (ipFailCount === 6) banTime = 1800;
            if (ipFailCount >= 7) banTime = 3600;
            await redisClient.set(`ratelimit:login:ban:ip:${ip}`, "true", {
              ex: banTime,
            });
            isBanned = true;
            maxBanTime = Math.max(maxBanTime, banTime);
          }
        }
      } catch (e) {
        process.stderr.write(
          `[login] Rate limiter strike error: ${(e as Error).message}\nStack: ${(e as Error).stack}\n`,
        );
      }
      return { isBanned, maxBanTime };
    };

    if (!username || username.length < 3 || username.length > 20) {
      const failure = await recordFailure();
      if (failure.isBanned) {
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", String(failure.maxBanTime));
        res.end(
          JSON.stringify({
            error: "Too many attempts. You are temporarily banned.",
            remainingSeconds: failure.maxBanTime,
          }),
        );
        return;
      }
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Username must be 3-20 characters." }));
      return;
    }

    const password = body.password || "";
    if (!password || password.length < 6 || password.length > 50) {
      const failure = await recordFailure();
      if (failure.isBanned) {
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", String(failure.maxBanTime));
        res.end(
          JSON.stringify({
            error: "Too many attempts. You are temporarily banned.",
            remainingSeconds: failure.maxBanTime,
          }),
        );
        return;
      }
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Password must be 6-50 characters." }));
      return;
    }

    try {
      const result = await authService.findUserByUsername(username);
      const user = result.rows[0] as User;

      const DUMMY_HASH =
        "$argon2id$v=19$m=65536,t=3,p=4$Wsc9jUU9AZRrUF7kN36guw$s8vga3AT4etuy5qcnJF/C8JWVfozcmBo12NhhGnCEMM";
      const hashToVerifyAgainst = user ? user.password_hash : DUMMY_HASH;
      const passwordMatches = await argon2.verify(
        hashToVerifyAgainst,
        password,
      );

      if (!user || !passwordMatches) {
        const failure = await recordFailure();
        if (failure.isBanned) {
          res.statusCode = 429;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Retry-After", String(failure.maxBanTime));
          res.end(
            JSON.stringify({
              error: "Too many attempts. You are temporarily banned.",
              remainingSeconds: failure.maxBanTime,
            }),
          );
          return;
        }
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid credentials" }));
        return;
      }

      let fullUser = user;
      try {
        const fullUserResult = await authService.findUserById(user.id);
        if (fullUserResult.rows.length > 0) {
          fullUser = fullUserResult.rows[0] as User;
        }
      } catch (fetchErr) {
        process.stderr.write(
          `[login] DB Error fetching full user profile for Redux state: ${(fetchErr as Error).message}\nStack: ${(fetchErr as Error).stack}\n`,
        );
      }

      const rawRefreshToken = crypto.randomBytes(64).toString("hex");
      const hashedRefreshToken = crypto
        .createHash("sha256")
        .update(rawRefreshToken)
        .digest("hex");

      const refreshExpiresAt = new Date(
        Date.now() + REFRESH_TOKEN_EXPIRY_MINUTES * 60 * 1000,
      );
      const userAgent = req.headers["user-agent"] || "unknown";

      await authService.createRefreshToken(
        user.id,
        hashedRefreshToken,
        refreshExpiresAt,
        userAgent,
        ip,
        null,
      );

      const payload: JWTPayload = {
        id: user.id,
        username: user.username,
        role: user.role,
        token_use: "access",
      };
      const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET as string, {
        expiresIn: `${ACCESS_TOKEN_EXPIRY_MINUTES}m`,
      });

      if (!isDev) {
        try {
          if (ip !== "unknown_ip") {
            await redisClient.del(`ratelimit:login:fail:ip:${ip}`);
            await redisClient.del(`ratelimit:login:ban:ip:${ip}`);
          }
        } catch (e) {
          process.stderr.write(
            `[login] Rate limiter clear error: ${(e as Error).message}\nStack: ${(e as Error).stack}\n`,
          );
        }
      }

      const isProd = process.env["NODE_ENV"] !== "development";
      const maxAgeSeconds = REFRESH_TOKEN_EXPIRY_MINUTES * 60;
      const cookieHeader = `refreshToken=${rawRefreshToken}; HttpOnly; ${isProd ? "SameSite=None; Secure;" : "SameSite=Lax;"} Path=/; Max-Age=${maxAgeSeconds}`;

      res.statusCode = 200;
      res.setHeader("Set-Cookie", cookieHeader);
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          accessToken,

          user: {
            id: fullUser.id,
            username: fullUser.username,
            role: fullUser.role,
            profile_title: fullUser.profile_title || null,
            avatar_url: fullUser.avatar_url || null,
          },
        }),
      );
      return;
    } catch (err) {
      const failure = await recordFailure();
      if (failure.isBanned) {
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", String(failure.maxBanTime));
        res.end(
          JSON.stringify({
            error: "Too many attempts. You are temporarily banned.",
            remainingSeconds: failure.maxBanTime,
          }),
        );
        return;
      }
      process.stderr.write(
        `[login] DB/Logic Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Login failed" }));
      return;
    }
  },

  async refresh(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const requestOrigin = req.headers.origin || "";
    if (!allowedOriginsForCsrfCheck.includes(requestOrigin)) {
      process.stderr.write(
        `[refresh] Rejected — origin '${requestOrigin}' not in allowed list.\n`,
      );
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Origin not allowed." }));
      return;
    }

    const isProdForCookie = process.env["NODE_ENV"] !== "development";
    const clearCookieHeader = `refreshToken=; HttpOnly; ${isProdForCookie ? "SameSite=None; Secure;" : "SameSite=Lax;"} Path=/; Max-Age=0`;

    let incomingRefreshToken = "";
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(";");
      for (const c of cookies) {
        const [name, val] = c.trim().split("=");
        if (name === "refreshToken" && val !== undefined) {
          incomingRefreshToken = val;
          break;
        }
      }
    }

    if (!incomingRefreshToken) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "No refresh token provided." }));
      return;
    }

    try {
      const hashedIncomingToken = crypto
        .createHash("sha256")
        .update(incomingRefreshToken)
        .digest("hex");
      const sessionResult =
        await authService.findRefreshTokenByHash(hashedIncomingToken);
      const session = sessionResult.rows[0];

      if (!session) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid refresh token." }));
        return;
      }

      if (session.is_revoked) {
        const ipForBreach =
          String(
            req.headers["x-forwarded-for"] || req.socket.remoteAddress,
          ).split(",")[0] || "unknown_ip";
        const uaForBreach = req.headers["user-agent"] || "unknown";

        process.stderr.write(
          `[SECURITY] Refresh-token reuse detected — burning entire family. userId=${session.user_id} sessionId=${session.id} tokenHashPrefix=${hashedIncomingToken.substring(0, 8)} ip=${ipForBreach} ua=${String(uaForBreach).substring(0, 120)}\n`,
        );
        await authService.revokeEntireTokenFamily(session.user_id);

        res.statusCode = 401;
        res.setHeader("Set-Cookie", clearCookieHeader);
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Security breach detected. All sessions revoked. Please log in again.",
            code: "REFRESH_REUSE_DETECTED",
          }),
        );
        return;
      }

      if (new Date(session.expires_at).getTime() < Date.now()) {
        res.statusCode = 401;
        res.setHeader("Set-Cookie", clearCookieHeader);
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Refresh token expired. Please log in again.",
          }),
        );
        return;
      }

      const sessionAgeMs =
        Date.now() - new Date(session.session_created_at).getTime();
      const absoluteCeilingMs =
        ABSOLUTE_SESSION_CEILING_DAYS * 24 * 60 * 60 * 1000;

      if (sessionAgeMs > absoluteCeilingMs) {
        process.stderr.write(
          `[refresh] Session exceeded absolute ceiling of ${ABSOLUTE_SESSION_CEILING_DAYS} days for user=${session.user_id}. Forcing re-login.\n`,
        );
        await authService.revokeEntireTokenFamily(session.user_id);
        res.statusCode = 401;
        res.setHeader("Set-Cookie", clearCookieHeader);
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Session expired after reaching its maximum lifetime. Please log in again.",
            code: "ABSOLUTE_SESSION_CEILING_REACHED",
          }),
        );
        return;
      }

      const userResult = await authService.findUserById(session.user_id);
      const user = userResult.rows[0] as User;

      if (!user) {
        res.statusCode = 401;
        res.setHeader("Set-Cookie", clearCookieHeader);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "User no longer exists." }));
        return;
      }

      await authService.revokeRefreshTokenById(session.id);

      const newRawRefreshToken = crypto.randomBytes(64).toString("hex");
      const newHashedRefreshToken = crypto
        .createHash("sha256")
        .update(newRawRefreshToken)
        .digest("hex");

      const refreshExpiresAt = new Date(
        Date.now() + REFRESH_TOKEN_EXPIRY_MINUTES * 60 * 1000,
      );
      const ip =
        String(
          req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        ).split(",")[0] || "unknown_ip";
      const userAgent = req.headers["user-agent"] || "unknown";

      await authService.createRefreshToken(
        user.id,
        newHashedRefreshToken,
        refreshExpiresAt,
        userAgent,
        ip,
        session.id,
        new Date(session.session_created_at),
      );

      const payload: JWTPayload = {
        id: user.id,
        username: user.username,
        role: user.role,
        token_use: "access",
      };
      const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET as string, {
        expiresIn: `${ACCESS_TOKEN_EXPIRY_MINUTES}m`,
      });

      const maxAgeSeconds = REFRESH_TOKEN_EXPIRY_MINUTES * 60;
      const cookieHeader = `refreshToken=${newRawRefreshToken}; HttpOnly; ${isProdForCookie ? "SameSite=None; Secure;" : "SameSite=Lax;"} Path=/; Max-Age=${maxAgeSeconds}`;

      res.statusCode = 200;
      res.setHeader("Set-Cookie", cookieHeader);
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          accessToken,

          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            profile_title: user.profile_title || null,
            avatar_url: user.avatar_url || null,
          },
        }),
      );
      return;
    } catch (err) {
      process.stderr.write(
        `[refresh] DB/Logic Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to refresh token." }));
      return;
    }
  },

  async logout(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const requestOrigin = req.headers.origin || "";
    if (!allowedOriginsForCsrfCheck.includes(requestOrigin)) {
      process.stderr.write(
        `[logout] Rejected — origin '${requestOrigin}' not in allowed list.\n`,
      );
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Origin not allowed." }));
      return;
    }

    let incomingRefreshToken = "";
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(";");
      for (const c of cookies) {
        const [name, val] = c.trim().split("=");
        if (name === "refreshToken" && val !== undefined) {
          incomingRefreshToken = val;
          break;
        }
      }
    }

    if (incomingRefreshToken) {
      try {
        const hashedIncomingToken = crypto
          .createHash("sha256")
          .update(incomingRefreshToken)
          .digest("hex");
        await authService.revokeRefreshTokenByHash(hashedIncomingToken);
      } catch (e) {
        process.stderr.write(
          `[logout] DB Error: ${(e as Error).message}\nStack: ${(e as Error).stack}\n`,
        );
      }
    }

    const isProd = process.env["NODE_ENV"] !== "development";
    res.statusCode = 200;
    res.setHeader(
      "Set-Cookie",
      `refreshToken=; HttpOnly; ${isProd ? "SameSite=None; Secure;" : "SameSite=Lax;"} Path=/; Max-Age=0`,
    );
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Logged out successfully" }));
  },

  async changePassword(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const verifyResult = await verifyAccessToken(
      req.headers.authorization,
      ACCESS_TOKEN_SECRET as string,
      "changePassword",
    );
    if (!verifyResult.ok) {
      res.statusCode = verifyResult.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(verifyResult.body));
      return;
    }
    const decoded = verifyResult.decoded;

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const targetId = url.searchParams.get("id") || decoded.id;

    if (decoded.id !== targetId && decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.end(
        JSON.stringify({
          error: "Forbidden: You can only change your own password.",
        }),
      );
      return;
    }

    let body: ChangePasswordDTO;
    try {
      body = (await json(req)) as ChangePasswordDTO;
    } catch (err) {
      process.stderr.write(
        `[changePassword] JSON Parse Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Invalid JSON format." }));
      return;
    }

    try {
      const { currentPassword, newPassword, confirmPassword } = body;

      if (!newPassword || newPassword.length < 6 || newPassword.length > 50) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({ error: "New password must be 6-50 characters." }),
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "New passwords do not match." }));
        return;
      }

      const userResult =
        await authService.findUserByIdWithPasswordHash(targetId);
      const user = userResult.rows[0] as User;

      if (!user) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Target user not found." }));
        return;
      }

      if (decoded.role !== "super_admin") {
        if (
          !currentPassword ||
          !(await argon2.verify(user.password_hash, currentPassword))
        ) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: "Current password incorrect" }));
          return;
        }
      }

      const newHash = await argon2.hash(newPassword);
      await authService.updatePassword(newHash, targetId);

      await authService.deleteAllUserRefreshTokens(targetId);
      await invalidateUserAccessTokens(targetId);

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message:
            "Password updated successfully. All other sessions logged out.",
        }),
      );
    } catch (err) {
      process.stderr.write(
        `[changePassword] DB/Logic Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Change password failed" }));
    }
  },

  async updateAccount(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const verifyResult = await verifyAccessToken(
      req.headers.authorization,
      ACCESS_TOKEN_SECRET as string,
      "updateAccount",
    );
    if (!verifyResult.ok) {
      res.statusCode = verifyResult.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(verifyResult.body));
      return;
    }
    const decoded = verifyResult.decoded;

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const targetId = url.searchParams.get("id") || decoded.id;

    if (decoded.id !== targetId && decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: "Forbidden: Access denied." }));
      return;
    }

    let body: UpdateAccountDTO;
    try {
      body = (await json(req)) as UpdateAccountDTO;
    } catch (err) {
      process.stderr.write(
        `[updateAccount] JSON Parse Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Invalid JSON format." }));
      return;
    }

    try {
      const { username, profileTitle, avatarUrl } = body;

      const imageExtensions =
        /\.(jpeg|jpg|gif|png|webp|avif|svg)(\?.*)?(#.*)?$/i;

      if (username !== undefined && username !== null) {
        const trimmedUser = username.trim();
        if (trimmedUser.length < 3 || trimmedUser.length > 20) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({ error: "Username must be 3-20 characters." }),
          );
          return;
        }

        const usernameCharacterAllowList = /^[a-zA-Z0-9_]+$/;
        if (!usernameCharacterAllowList.test(trimmedUser)) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error:
                "Username can only contain letters, numbers, and underscores.",
            }),
          );
          return;
        }
      }

      if (profileTitle !== undefined && profileTitle !== null) {
        if (profileTitle.length > 100) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: "Profile title cannot exceed 100 characters.",
            }),
          );
          return;
        }
      }

      if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== "") {
        const trimmedUrl = avatarUrl.trim();

        if (trimmedUrl.length > 2048) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: "Avatar URL cannot exceed 2048 characters.",
            }),
          );
          return;
        }

        try {
          new URL(trimmedUrl);
        } catch (err) {
          process.stderr.write(
            `[updateAccount] URL Parsing Error for string '${trimmedUrl}': ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
          );
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: "Please enter a properly formatted URL.",
            }),
          );
          return;
        }

        if (!imageExtensions.test(trimmedUrl)) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error:
                "Please enter a valid image URL ending in .jpg, .png, .gif, etc.",
            }),
          );
          return;
        }
      }

      const avatarUrlProvided = avatarUrl !== undefined;
      let finalAvatarUrl: string | null = null;
      if (avatarUrl) {
        finalAvatarUrl = avatarUrl.trim();
      }

      if (username || profileTitle !== undefined || avatarUrlProvided) {
        try {
          await authService.updateUser(
            username ? username.trim() : null,
            profileTitle !== undefined
              ? profileTitle.trim() === ""
                ? "Member"
                : profileTitle.trim()
              : null,
            finalAvatarUrl,
            avatarUrlProvided,
            targetId,
          );
        } catch (err) {
          const pgCode = (err as any)?.code;
          const pgConstraint = (err as any)?.constraint || "";

          if (pgCode === "23505") {
            process.stderr.write(
              `[updateAccount] Duplicate username on rename rejected (23505) constraint=${pgConstraint} detail=${(err as any)?.detail || "n/a"}\n`,
            );
            res.statusCode = 409;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Username already taken. Pick a different one.",
                field: "username",
                code: "USERNAME_TAKEN",
              }),
            );
            return;
          }

          process.stderr.write(
            `[updateAccount] DB/Logic Error updating user info code=${pgCode || "n/a"} constraint=${pgConstraint || "n/a"}: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
          );
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error:
                "Failed to update profile data due to a server error. Please retry.",
            }),
          );
          return;
        }
      }

      try {
        const updatedUserResult = await authService.findUserById(targetId);

        if (updatedUserResult.rows.length === 0) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "User not found after update." }));
          return;
        }

        const user = updatedUserResult.rows[0];

        const safeUser = {
          id: user.id,
          username: user.username,
          role: user.role,
          profile_title: user.profile_title,
          avatar_url: user.avatar_url,
        };

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            message: "Account updated successfully.",
            user: safeUser,
          }),
        );
      } catch (err) {
        process.stderr.write(
          `[updateAccount] DB/Logic Error fetching updated user: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
        );
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            error: "Failed to retrieve updated user profile.",
          }),
        );
        return;
      }
    } catch (err) {
      process.stderr.write(
        `[updateAccount] Unexpected Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          error:
            "Account update failed due to an unexpected server error. Please retry.",
        }),
      );
    }
  },

  async uploadAvatar(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const verifyResult = await verifyAccessToken(
      req.headers.authorization,
      ACCESS_TOKEN_SECRET as string,
      "uploadAvatar",
    );
    if (!verifyResult.ok) {
      res.statusCode = verifyResult.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(verifyResult.body));
      return;
    }
    const decoded = verifyResult.decoded;

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const targetId = url.searchParams.get("id") || decoded.id;

    if (decoded.id !== targetId && decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: "Forbidden: Access denied." }));
      return;
    }

    const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;

    let bb;
    try {
      bb = busboy({
        headers: req.headers,
        limits: { fileSize: MAX_AVATAR_UPLOAD_BYTES },
      });
    } catch (err) {
      process.stderr.write(
        `[uploadAvatar] Busboy Initialization Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Invalid form data headers." }));
      return;
    }

    let fileFound = false;

    bb.on("file", (_name, file, info) => {
      fileFound = true;
      let fileTooLarge = false;

      file.on("limit", () => {
        fileTooLarge = true;
        process.stderr.write(
          `[uploadAvatar] File exceeded max size of ${MAX_AVATAR_UPLOAD_BYTES} bytes. Aborting upload.\n`,
        );
        if (!res.headersSent) {
          res.statusCode = 413;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: "Image exceeds the 5MB size limit." }),
          );
        }
      });

      try {
        const { mimeType } = info;

        if (!mimeType.startsWith("image/")) {
          file.resume();
          if (!res.headersSent) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Only image files are allowed." }));
          }
          return;
        }

        const uploadStream = mediaStorage.uploader.upload_stream(
          { folder: "hwapyong/profile" },
          (error, result) => {
            if (fileTooLarge) {
              process.stderr.write(
                `[uploadAvatar] Discarding Cloudinary result for oversized upload.\n`,
              );
              return;
            }

            if (error) {
              process.stderr.write(
                `[uploadAvatar] Cloudinary Upload Stream Error: ${error.message}\n`,
              );
              if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: "Failed to upload image to Cloudinary.",
                  }),
                );
              }
              return;
            }

            if (result && result.secure_url) {
              if (!res.headersSent) {
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ url: result.secure_url }));
              }
            }
          },
        );

        file.on("error", (err) => {
          process.stderr.write(
            `[uploadAvatar] Busboy File Stream Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
          );
        });

        file.pipe(uploadStream);
      } catch (err) {
        process.stderr.write(
          `[uploadAvatar] Busboy File Event Processing Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
        );
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: "Server error during file processing." }),
          );
        }
      }
    });

    bb.on("error", (err) => {
      process.stderr.write(
        `[uploadAvatar] Busboy Parse Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Form parsing failed." }));
      }
    });

    bb.on("finish", () => {
      if (!fileFound && !res.headersSent) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "No image file provided in the request." }),
        );
      }
    });

    try {
      req.pipe(bb);
    } catch (err) {
      process.stderr.write(
        `[uploadAvatar] Request Pipe Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Failed to read request body." }));
      }
    }
  },

  async deleteAccount(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const verifyResult = await verifyAccessToken(
      req.headers.authorization,
      ACCESS_TOKEN_SECRET as string,
      "deleteAccount",
    );
    if (!verifyResult.ok) {
      res.statusCode = verifyResult.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(verifyResult.body));
      return;
    }
    const decoded = verifyResult.decoded;

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const targetId = url.searchParams.get("id") || decoded.id;

    if (decoded.id !== targetId && decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.end(
        JSON.stringify({
          error:
            "Forbidden: Only the owner or a Super Admin can delete this account.",
        }),
      );
      return;
    }

    const DEFAULT_AVATAR_URL =
      "https://res.cloudinary.com/dhr9zmb3i/image/upload/v1782114895/avatar-fallback_jnzqae.jpg";

    try {
      const targetUserResult = await authService.findUserById(targetId);
      const targetUser = targetUserResult.rows[0] as User | undefined;

      await authService.deleteUser(targetId);
      await invalidateUserAccessTokens(targetId);

      if (
        targetUser &&
        targetUser.avatar_url &&
        targetUser.avatar_url !== DEFAULT_AVATAR_URL
      ) {
        try {
          const avatarUrlParts = targetUser.avatar_url.split("/upload/");
          const avatarUrlAfterUpload = avatarUrlParts[1];
          if (avatarUrlParts.length === 2 && avatarUrlAfterUpload) {
            const afterUpload = avatarUrlAfterUpload.replace(/^v\d+\//, "");

            const publicId = afterUpload.replace(/\.[^/.]+$/, "");

            await mediaStorage.uploader.destroy(publicId);
          }
        } catch (cloudinaryErr) {
          process.stderr.write(
            `[deleteAccount] Cloudinary avatar cleanup failed for user=${targetId}: ${(cloudinaryErr as Error).message}\nStack: ${(cloudinaryErr as Error).stack}\n`,
          );
        }
      }

      res.statusCode = 200;

      if (decoded.id === targetId) {
        const isProd = process.env["NODE_ENV"] !== "development";
        res.setHeader(
          "Set-Cookie",
          `refreshToken=; HttpOnly; ${isProd ? "SameSite=None; Secure;" : "SameSite=Lax;"} Path=/; Max-Age=0`,
        );
      }

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Account deleted" }));
    } catch (err) {
      process.stderr.write(
        `[deleteAccount] DB/Logic Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Deletion failed" }));
    }
  },
};

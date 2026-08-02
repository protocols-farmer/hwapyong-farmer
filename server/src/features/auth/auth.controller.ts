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

const ACCESS_TOKEN_SECRET = process.env["ACCESS_TOKEN_SECRET"];
const ACCESS_TOKEN_EXPIRY_MINUTES = parseInt(
  process.env["ACCESS_TOKEN_EXPIRY_MINUTES"] || "15",
  10,
);
const REFRESH_TOKEN_EXPIRY_MINUTES = parseInt(
  process.env["REFRESH_TOKEN_EXPIRY_MINUTES"] || "10080",
  10,
);

if (
  !ACCESS_TOKEN_SECRET ||
  !ACCESS_TOKEN_EXPIRY_MINUTES ||
  !REFRESH_TOKEN_EXPIRY_MINUTES
) {
  process.stderr.write(
    "FATAL ERROR: ACCESS_TOKEN_SECRET OR ACCESS_TOKEN_EXPIRY_MINUTES OR REFRESH_TOKEN_EXPIRY_MINUTES is not defined.\n",
  );
  process.exit(1);
}

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
      const cookieHeader = `refreshToken=${rawRefreshToken}; HttpOnly; ${isProd ? "Secure;" : ""} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;

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
            profile_title: null,
            avatar_url: null,
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
        const userBan = await redisClient.ttl(
          `ratelimit:login:ban:user:${username}`,
        );

        const highestBan = Math.max(ipBan, userBan);

        if (highestBan > 0) {
          res.statusCode = 429;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Retry-After", String(highestBan));
          res.end(
            JSON.stringify({
              error: "Too many attempts. You are temporarily banned.",
              remainingSeconds: highestBan,
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

        if (username) {
          const userFailCount = await redisClient.incr(
            `ratelimit:login:fail:user:${username}`,
          );
          if (userFailCount === 1)
            await redisClient.expire(
              `ratelimit:login:fail:user:${username}`,
              86400,
            );
          if (userFailCount >= 5) {
            let banTime = 900;
            if (userFailCount === 6) banTime = 1800;
            if (userFailCount >= 7) banTime = 3600;
            await redisClient.set(
              `ratelimit:login:ban:user:${username}`,
              "true",
              { ex: banTime },
            );
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
          await redisClient.del(`ratelimit:login:fail:user:${username}`);
          await redisClient.del(`ratelimit:login:ban:user:${username}`);
        } catch (e) {
          process.stderr.write(
            `[login] Rate limiter clear error: ${(e as Error).message}\nStack: ${(e as Error).stack}\n`,
          );
        }
      }

      const isProd = process.env["NODE_ENV"] !== "development";
      const maxAgeSeconds = REFRESH_TOKEN_EXPIRY_MINUTES * 60;
      const cookieHeader = `refreshToken=${rawRefreshToken}; HttpOnly; ${isProd ? "Secure;" : ""} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;

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
        res.setHeader(
          "Set-Cookie",
          `refreshToken=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
        );
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
        res.setHeader(
          "Set-Cookie",
          `refreshToken=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
        );
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Refresh token expired. Please log in again.",
          }),
        );
        return;
      }

      const userResult = await authService.findUserById(session.user_id);
      const user = userResult.rows[0] as User;

      if (!user) {
        res.statusCode = 401;
        res.setHeader(
          "Set-Cookie",
          `refreshToken=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
        );
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

      const isProd = process.env["NODE_ENV"] !== "development";
      const maxAgeSeconds = REFRESH_TOKEN_EXPIRY_MINUTES * 60;
      const cookieHeader = `refreshToken=${newRawRefreshToken}; HttpOnly; ${isProd ? "Secure;" : ""} SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;

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
      `refreshToken=; HttpOnly; ${isProd ? "Secure;" : ""} SameSite=Strict; Path=/; Max-Age=0`,
    );
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Logged out successfully" }));
  },

  async changePassword(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const token = authHeader.split(" ")[1];
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        token as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
      if (decoded.token_use !== "access") throw new Error("Invalid token type");
    } catch (err) {
      const jwtErrName = (err as Error)?.name;
      const jwtErrMsg = (err as Error)?.message || "";
      const isExpired = jwtErrName === "TokenExpiredError";
      const isInvalidSignature =
        jwtErrName === "JsonWebTokenError" ||
        jwtErrMsg === "Invalid token type";
      process.stderr.write(
        `[changePassword] JWT Verify Error name=${jwtErrName} expired=${isExpired} invalid=${isInvalidSignature}: ${jwtErrMsg}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: isExpired
            ? "Access token expired. Please refresh and retry."
            : isInvalidSignature
              ? "Access token is invalid or tampered. Please log in again."
              : "Unauthorized.",
          code: isExpired
            ? "TOKEN_EXPIRED"
            : isInvalidSignature
              ? "TOKEN_INVALID"
              : "AUTH_UNKNOWN",
        }),
      );
      return;
    }

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

      const userResult = await authService.findUserById(targetId);
      const user = userResult.rows[0] as User;

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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const token = authHeader.split(" ")[1];
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        token as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
      if (decoded.token_use !== "access") throw new Error("Invalid token type");
    } catch (err) {
      const jwtErrName = (err as Error)?.name;
      const jwtErrMsg = (err as Error)?.message || "";
      const isExpired = jwtErrName === "TokenExpiredError";
      const isInvalidSignature =
        jwtErrName === "JsonWebTokenError" ||
        jwtErrMsg === "Invalid token type";
      process.stderr.write(
        `[updateAccount] JWT Verify Error name=${jwtErrName} expired=${isExpired} invalid=${isInvalidSignature}: ${jwtErrMsg}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: isExpired
            ? "Access token expired. Please refresh and retry."
            : isInvalidSignature
              ? "Access token is invalid or tampered. Please log in again."
              : "Unauthorized.",
          code: isExpired
            ? "TOKEN_EXPIRED"
            : isInvalidSignature
              ? "TOKEN_INVALID"
              : "AUTH_UNKNOWN",
        }),
      );
      return;
    }

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
      console.log("2. CONTROLLER RECEIVED BODY:", body);
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

      const imageExtensions = /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?(#.*)?$/i;

      if (username !== undefined && username !== null) {
        const trimmedUser = username.trim();
        if (trimmedUser.length < 3 || trimmedUser.length > 20) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({ error: "Username must be 3-20 characters." }),
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

      let finalAvatarUrl: string | null = null;
      if (avatarUrl) {
        finalAvatarUrl = avatarUrl.trim();
      }

      if (username || profileTitle !== undefined || finalAvatarUrl !== null) {
        try {
          await authService.updateUser(
            username ? username.trim() : null,
            profileTitle !== undefined
              ? profileTitle.trim() === ""
                ? "Member"
                : profileTitle.trim()
              : null,
            finalAvatarUrl,
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
          profile_title: user.profile_title,
          avatar_url: user.avatar_url,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at,
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const token = authHeader.split(" ")[1];
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        token as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
      if (decoded.token_use !== "access") throw new Error("Invalid token type");
    } catch (err) {
      const jwtErrName = (err as Error)?.name;
      const jwtErrMsg = (err as Error)?.message || "";
      const isExpired = jwtErrName === "TokenExpiredError";
      const isInvalidSignature =
        jwtErrName === "JsonWebTokenError" ||
        jwtErrMsg === "Invalid token type";
      process.stderr.write(
        `[uploadAvatar] JWT Verify Error name=${jwtErrName} expired=${isExpired} invalid=${isInvalidSignature}: ${jwtErrMsg}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: isExpired
            ? "Access token expired. Please refresh and retry."
            : isInvalidSignature
              ? "Access token is invalid or tampered. Please log in again."
              : "Unauthorized.",
          code: isExpired
            ? "TOKEN_EXPIRED"
            : isInvalidSignature
              ? "TOKEN_INVALID"
              : "AUTH_UNKNOWN",
        }),
      );
      return;
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const targetId = url.searchParams.get("id") || decoded.id;

    if (decoded.id !== targetId && decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: "Forbidden: Access denied." }));
      return;
    }

    let bb;
    try {
      bb = busboy({ headers: req.headers });
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
          { folder: "portfolio" },
          (error, result) => {
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const token = authHeader.split(" ")[1];
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        token as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
      if (decoded.token_use !== "access") throw new Error("Invalid token type");
    } catch (err) {
      const jwtErrName = (err as Error)?.name;
      const jwtErrMsg = (err as Error)?.message || "";
      const isExpired = jwtErrName === "TokenExpiredError";
      const isInvalidSignature =
        jwtErrName === "JsonWebTokenError" ||
        jwtErrMsg === "Invalid token type";
      process.stderr.write(
        `[deleteAccount] JWT Verify Error name=${jwtErrName} expired=${isExpired} invalid=${isInvalidSignature}: ${jwtErrMsg}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: isExpired
            ? "Access token expired. Please refresh and retry."
            : isInvalidSignature
              ? "Access token is invalid or tampered. Please log in again."
              : "Unauthorized.",
          code: isExpired
            ? "TOKEN_EXPIRED"
            : isInvalidSignature
              ? "TOKEN_INVALID"
              : "AUTH_UNKNOWN",
        }),
      );
      return;
    }

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

    try {
      await authService.deleteUser(targetId);

      res.statusCode = 200;

      if (decoded.id === targetId) {
        const isProd = process.env["NODE_ENV"] !== "development";
        res.setHeader(
          "Set-Cookie",
          `refreshToken=; HttpOnly; ${isProd ? "Secure;" : ""} SameSite=Strict; Path=/; Max-Age=0`,
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

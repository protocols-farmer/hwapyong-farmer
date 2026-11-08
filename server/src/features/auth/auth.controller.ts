//src/features/auth/auth.controller.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "node:stream/consumers";
import crypto from "node:crypto";
import argon2 from "argon2";
import busboy from "busboy";
import { authService } from "./auth.service.js";
import { verifySession } from "./verifySession.js";
import { mediaStorage } from "../../db/cloudinary.js";
import { DEFAULT_AVATAR_URL } from "../../config/constants.js";
import {
  IS_DEV,
  SESSION_EXPIRY_DAYS,
  LOGIN_FAIL_LIMIT,
  LOGIN_LOCK_MINUTES,
  TRUSTED_PROXY_HOPS,
} from "../../config/env.js";
import type {
  LoginDTO,
  ChangePasswordDTO,
  UpdateProfileDTO,
  Profile,
} from "./auth.types.js";

interface LoginAttemptRecord {
  failures: number;
  lockedUntilMs: number;
  lastAttemptMs: number;
}

const loginAttemptsByIp = new Map<string, LoginAttemptRecord>();

export const authController = {
  async login(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let clientIp = "unknown_ip";
    if (TRUSTED_PROXY_HOPS === 0) {
      clientIp = req.socket.remoteAddress || "unknown_ip";
    } else {
      const forwardedHeader = req.headers["x-forwarded-for"];
      const rawForwarded = Array.isArray(forwardedHeader)
        ? forwardedHeader.join(",")
        : String(forwardedHeader || "");
      const hopsList = rawForwarded
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (hopsList.length >= TRUSTED_PROXY_HOPS) {
        clientIp =
          hopsList[hopsList.length - TRUSTED_PROXY_HOPS] || "unknown_ip";
      } else if (hopsList.length > 0) {
        clientIp = hopsList[0] || "unknown_ip";
      } else {
        clientIp = req.socket.remoteAddress || "unknown_ip";
      }
    }

    const nowMs = Date.now();
    const staleThresholdMs = LOGIN_LOCK_MINUTES * 60 * 1000 * 2;
    for (const [trackedIp, entry] of loginAttemptsByIp.entries()) {
      if (
        (entry.lockedUntilMs > 0 && entry.lockedUntilMs <= nowMs) ||
        (entry.lockedUntilMs === 0 &&
          nowMs - entry.lastAttemptMs > staleThresholdMs)
      ) {
        loginAttemptsByIp.delete(trackedIp);
      }
    }

    if (!IS_DEV) {
      const existingRecord = loginAttemptsByIp.get(clientIp);
      if (existingRecord && existingRecord.lockedUntilMs > nowMs) {
        const remainingSeconds = Math.ceil(
          (existingRecord.lockedUntilMs - nowMs) / 1000,
        );
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", String(remainingSeconds));
        res.end(
          JSON.stringify({
            error: "Too many login attempts. Please try again later.",
            remainingSeconds,
          }),
        );
        return;
      }
    }

    let body: LoginDTO;
    try {
      body = (await json(req)) as LoginDTO;
    } catch (err) {
      console.error("[auth.controller.login] JSON parse failed", err);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON format." }));
      return;
    }

    const recordLoginFailure = (): {
      locked: boolean;
      remainingSeconds: number;
    } => {
      if (IS_DEV) {
        return { locked: false, remainingSeconds: 0 };
      }
      const current = loginAttemptsByIp.get(clientIp) || {
        failures: 0,
        lockedUntilMs: 0,
        lastAttemptMs: Date.now(),
      };
      current.failures += 1;
      current.lastAttemptMs = Date.now();

      if (current.failures >= LOGIN_FAIL_LIMIT) {
        const lockDurationMs = LOGIN_LOCK_MINUTES * 60 * 1000;
        current.lockedUntilMs = Date.now() + lockDurationMs;
        loginAttemptsByIp.set(clientIp, current);
        console.warn(
          `[auth.controller.login] IP locked after ${current.failures} failed attempts: ip=${clientIp}`,
        );
        return {
          locked: true,
          remainingSeconds: LOGIN_LOCK_MINUTES * 60,
        };
      }

      loginAttemptsByIp.set(clientIp, current);
      return { locked: false, remainingSeconds: 0 };
    };

    const username = body.username?.trim() || "";
    if (!username || username.length < 3 || username.length > 20) {
      const lockState = recordLoginFailure();
      if (lockState.locked) {
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", String(lockState.remainingSeconds));
        res.end(
          JSON.stringify({
            error: "Too many login attempts. Please try again later.",
            remainingSeconds: lockState.remainingSeconds,
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
      const lockState = recordLoginFailure();
      if (lockState.locked) {
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Retry-After", String(lockState.remainingSeconds));
        res.end(
          JSON.stringify({
            error: "Too many login attempts. Please try again later.",
            remainingSeconds: lockState.remainingSeconds,
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
      const ownerResult = await authService.findOwnerByUsername(username);
      const owner = ownerResult.rows[0] as Profile | undefined;

      const DUMMY_HASH =
        "$argon2id$v=19$m=65536,t=3,p=4$Wsc9jUU9AZRrUF7kN36guw$s8vga3AT4etuy5qcnJF/C8JWVfozcmBo12NhhGnCEMM";
      const hashToVerifyAgainst = owner ? owner.password_hash : DUMMY_HASH;
      const passwordMatches = await argon2.verify(
        hashToVerifyAgainst,
        password,
      );

      if (!owner || !passwordMatches) {
        const lockState = recordLoginFailure();
        if (lockState.locked) {
          res.statusCode = 429;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Retry-After", String(lockState.remainingSeconds));
          res.end(
            JSON.stringify({
              error: "Too many login attempts. Please try again later.",
              remainingSeconds: lockState.remainingSeconds,
            }),
          );
          return;
        }
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid credentials" }));
        return;
      }

      loginAttemptsByIp.delete(clientIp);

      try {
        await authService.deleteExpiredSessions();
      } catch (cleanupErr) {
        console.error(
          "[auth.controller.login] Failed to delete expired sessions during login",
          cleanupErr,
        );
      }

      const rawSessionToken = crypto.randomBytes(48).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawSessionToken)
        .digest("hex");
      const expiresAt = new Date(
        Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      );
      const userAgent = String(req.headers["user-agent"] || "unknown").slice(
        0,
        1024,
      );

      await authService.createSession(
        tokenHash,
        expiresAt,
        userAgent,
        clientIp,
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          sessionToken: rawSessionToken,
          expiresAt: expiresAt.toISOString(),
          user: {
            id: owner.id,
            username: owner.username,
            display_name: owner.display_name,
            profile_title: owner.profile_title,
            avatar_url: owner.avatar_url,
          },
        }),
      );
    } catch (err) {
      console.error("[auth.controller.login] Login execution failed", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Login failed due to a server error." }));
    }
  },

  async logout(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized", code: "AUTH_MISSING" }));
      return;
    }

    const rawToken = authHeader.slice("Bearer ".length).trim();
    if (!rawToken) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized", code: "AUTH_MISSING" }));
      return;
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    try {
      await authService.deleteSessionByTokenHash(tokenHash);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Logged out successfully" }));
    } catch (err) {
      console.error("[auth.controller.logout] Failed to delete session", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ error: "Logout failed due to a server error." }),
      );
    }
  },

  async me(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const verifyResult = await verifySession(req.headers.authorization, "me");
    if (!verifyResult.ok) {
      res.statusCode = verifyResult.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(verifyResult.body));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        user: {
          id: verifyResult.session.ownerId,
          username: verifyResult.session.username,
          display_name: verifyResult.session.display_name,
          profile_title: verifyResult.session.profile_title,
          avatar_url: verifyResult.session.avatar_url,
        },
      }),
    );
  },

  async getPublicProfile(
    _req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const result = await authService.getProfile();
      if (result.rows.length === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Profile not found." }));
        return;
      }

      const profile = result.rows[0] as Profile;
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          profile: {
            display_name: profile.display_name,
            profile_title: profile.profile_title,
            avatar_url: profile.avatar_url,
          },
        }),
      );
    } catch (err) {
      console.error(
        "[auth.controller.getPublicProfile] Failed to fetch public profile",
        err,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to fetch profile." }));
    }
  },

  async changePassword(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const verifyResult = await verifySession(
      req.headers.authorization,
      "changePassword",
    );
    if (!verifyResult.ok) {
      res.statusCode = verifyResult.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(verifyResult.body));
      return;
    }

    let body: ChangePasswordDTO;
    try {
      body = (await json(req)) as ChangePasswordDTO;
    } catch (err) {
      console.error("[auth.controller.changePassword] JSON parse failed", err);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON format." }));
      return;
    }

    try {
      const { currentPassword, newPassword, confirmPassword } = body;

      if (!currentPassword) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Current password is required." }));
        return;
      }

      if (!newPassword || newPassword.length < 6 || newPassword.length > 50) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "New password must be 6-50 characters." }),
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "New passwords do not match." }));
        return;
      }

      const profileResult = await authService.getProfile();
      const owner = profileResult.rows[0] as Profile | undefined;

      if (!owner) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Profile not found." }));
        return;
      }

      const currentMatches = await argon2.verify(
        owner.password_hash,
        currentPassword,
      );
      if (!currentMatches) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Current password incorrect." }));
        return;
      }

      const newHash = await argon2.hash(newPassword);
      await authService.updatePassword(newHash);
      await authService.deleteAllSessions();

      let clientIp = "unknown_ip";
      if (TRUSTED_PROXY_HOPS === 0) {
        clientIp = req.socket.remoteAddress || "unknown_ip";
      } else {
        const forwardedHeader = req.headers["x-forwarded-for"];
        const rawForwarded = Array.isArray(forwardedHeader)
          ? forwardedHeader.join(",")
          : String(forwardedHeader || "");
        const hopsList = rawForwarded
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        if (hopsList.length >= TRUSTED_PROXY_HOPS) {
          clientIp =
            hopsList[hopsList.length - TRUSTED_PROXY_HOPS] || "unknown_ip";
        } else if (hopsList.length > 0) {
          clientIp = hopsList[0] || "unknown_ip";
        } else {
          clientIp = req.socket.remoteAddress || "unknown_ip";
        }
      }

      const rawSessionToken = crypto.randomBytes(48).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawSessionToken)
        .digest("hex");
      const expiresAt = new Date(
        Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      );
      const userAgent = String(req.headers["user-agent"] || "unknown").slice(
        0,
        1024,
      );

      await authService.createSession(
        tokenHash,
        expiresAt,
        userAgent,
        clientIp,
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message:
            "Password updated successfully. All previous sessions invalidated.",
          sessionToken: rawSessionToken,
          expiresAt: expiresAt.toISOString(),
        }),
      );
    } catch (err) {
      console.error(
        "[auth.controller.changePassword] Password change failed",
        err,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Change password failed." }));
    }
  },

  async updateProfile(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const verifyResult = await verifySession(
      req.headers.authorization,
      "updateProfile",
    );
    if (!verifyResult.ok) {
      res.statusCode = verifyResult.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(verifyResult.body));
      return;
    }

    let body: UpdateProfileDTO;
    try {
      body = (await json(req)) as UpdateProfileDTO;
    } catch (err) {
      console.error("[auth.controller.updateProfile] JSON parse failed", err);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON format." }));
      return;
    }

    try {
      const rawUsername = body.username;
      const rawDisplayName = body.display_name;
      const rawProfileTitle =
        body.profile_title !== undefined
          ? body.profile_title
          : body.profileTitle;
      const rawAvatarUrl =
        body.avatar_url !== undefined ? body.avatar_url : body.avatarUrl;

      const imageExtensions =
        /\.(jpeg|jpg|gif|png|webp|avif|svg)(\?.*)?(#.*)?$/i;

      let validatedUsername: string | null = null;
      if (rawUsername !== undefined && rawUsername !== null) {
        const trimmedUser = rawUsername.trim();
        if (trimmedUser.length < 3 || trimmedUser.length > 20) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: "Username must be 3-20 characters." }),
          );
          return;
        }
        const usernameCharacterAllowList = /^[a-zA-Z0-9_]+$/;
        if (!usernameCharacterAllowList.test(trimmedUser)) {
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
        validatedUsername = trimmedUser;
      }

      let validatedDisplayName: string | null = null;
      if (rawDisplayName !== undefined && rawDisplayName !== null) {
        const trimmedDisplay = rawDisplayName.trim();
        if (trimmedDisplay.length < 2 || trimmedDisplay.length > 50) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: "Display name must be 2-50 characters." }),
          );
          return;
        }
        validatedDisplayName = trimmedDisplay;
      }

      let validatedProfileTitle: string | null = null;
      if (rawProfileTitle !== undefined && rawProfileTitle !== null) {
        const trimmedTitle = rawProfileTitle.trim();
        if (trimmedTitle.length > 100) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "Profile title cannot exceed 100 characters.",
            }),
          );
          return;
        }
        validatedProfileTitle = trimmedTitle === "" ? "Member" : trimmedTitle;
      }

      const avatarUrlProvided =
        rawAvatarUrl !== undefined && rawAvatarUrl !== null;
      let finalAvatarUrl: string | null = null;

      if (avatarUrlProvided) {
        const trimmedUrl = rawAvatarUrl.trim();
        if (trimmedUrl === "") {
          finalAvatarUrl = DEFAULT_AVATAR_URL;
        } else {
          if (trimmedUrl.length > 2048) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Avatar URL cannot exceed 2048 characters.",
              }),
            );
            return;
          }

          try {
            new URL(trimmedUrl);
          } catch (urlErr) {
            console.error(
              "[auth.controller.updateProfile] Invalid avatar URL format",
              urlErr,
            );
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Please enter a properly formatted URL.",
              }),
            );
            return;
          }

          if (!imageExtensions.test(trimmedUrl)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error:
                  "Please enter a valid image URL ending in .jpg, .png, .gif, etc.",
              }),
            );
            return;
          }

          finalAvatarUrl = trimmedUrl;
        }
      }

      const previousAvatarUrl = verifyResult.session.avatar_url;

      const updatedResult = await authService.updateProfile(
        validatedUsername,
        validatedDisplayName,
        validatedProfileTitle,
        finalAvatarUrl,
        avatarUrlProvided,
      );

      if (updatedResult.rows.length === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Profile not found." }));
        return;
      }

      const updatedProfile = updatedResult.rows[0] as Profile;

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: "Profile updated successfully.",
          user: {
            id: updatedProfile.id,
            username: updatedProfile.username,
            display_name: updatedProfile.display_name,
            profile_title: updatedProfile.profile_title,
            avatar_url: updatedProfile.avatar_url,
          },
        }),
      );

      if (
        avatarUrlProvided &&
        previousAvatarUrl &&
        previousAvatarUrl !== updatedProfile.avatar_url &&
        previousAvatarUrl !== DEFAULT_AVATAR_URL &&
        previousAvatarUrl.includes("cloudinary.com")
      ) {
        try {
          const urlParts = previousAvatarUrl.split("/upload/");
          const afterUploadRaw = urlParts[1];
          if (urlParts.length === 2 && afterUploadRaw) {
            const afterVersion = afterUploadRaw.replace(/^v\d+\//, "");
            const publicId = afterVersion.replace(/\.[^/.]+$/, "");
            await mediaStorage.uploader.destroy(publicId);
          }
        } catch (cloudinaryErr) {
          console.error(
            "[auth.controller.updateProfile] Failed to destroy previous Cloudinary avatar",
            cloudinaryErr,
          );
        }
      }
    } catch (err) {
      console.error(
        "[auth.controller.updateProfile] Failed to update profile",
        err,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to update profile." }));
    }
  },

  async uploadAvatar(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const verifyResult = await verifySession(
      req.headers.authorization,
      "uploadAvatar",
    );
    if (!verifyResult.ok) {
      res.statusCode = verifyResult.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(verifyResult.body));
      return;
    }

    const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;

    let bb;
    try {
      bb = busboy({
        headers: req.headers,
        limits: { files: 1, fileSize: MAX_AVATAR_UPLOAD_BYTES },
      });
    } catch (err) {
      console.error(
        "[auth.controller.uploadAvatar] Busboy initialization failed",
        err,
      );
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid form data headers." }));
      return;
    }

    let fileFound = false;

    bb.on("file", (_name, file, info) => {
      fileFound = true;
      let fileTooLarge = false;

      file.on("limit", () => {
        fileTooLarge = true;
        console.warn(
          `[auth.controller.uploadAvatar] File exceeded max size of ${MAX_AVATAR_UPLOAD_BYTES} bytes.`,
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
              return;
            }

            if (error) {
              console.error(
                "[auth.controller.uploadAvatar] Cloudinary upload stream error",
                error,
              );
              if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: "Failed to upload image to storage.",
                  }),
                );
              }
              return;
            }

            if (result && result.secure_url && !res.headersSent) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ url: result.secure_url }));
            }
          },
        );

        file.on("error", (err) => {
          console.error(
            "[auth.controller.uploadAvatar] Busboy file stream error",
            err,
          );
        });

        file.pipe(uploadStream);
      } catch (err) {
        console.error(
          "[auth.controller.uploadAvatar] File processing error",
          err,
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
      console.error("[auth.controller.uploadAvatar] Busboy parse error", err);
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
      console.error("[auth.controller.uploadAvatar] Request pipe error", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Failed to read request body." }));
      }
    }
  },
};

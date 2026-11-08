//src/features/auth/verifySession.ts
import crypto from "node:crypto";
import { authService } from "./auth.service.js";

export type SessionVerifyResult =
  | {
      ok: true;
      session: {
        sessionId: string;
        ownerId: string;
        username: string;
        display_name: string;
        profile_title: string;
        avatar_url: string;
      };
    }
  | {
      ok: false;
      statusCode: number;
      body: { error: string; code: string };
    };

export const verifySession = async (
  authHeader: string | undefined,
  logPrefix: string,
): Promise<SessionVerifyResult> => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      statusCode: 401,
      body: { error: "Unauthorized", code: "AUTH_MISSING" },
    };
  }

  const rawToken = authHeader.slice("Bearer ".length).trim();
  if (!rawToken) {
    return {
      ok: false,
      statusCode: 401,
      body: { error: "Unauthorized", code: "AUTH_MISSING" },
    };
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  try {
    const result = await authService.findSessionByTokenHash(tokenHash);
    if (result.rows.length === 0) {
      return {
        ok: false,
        statusCode: 401,
        body: {
          error: "Session invalid or expired. Please log in again.",
          code: "SESSION_INVALID",
        },
      };
    }

    const row = result.rows[0];
    return {
      ok: true,
      session: {
        sessionId: row.session_id,
        ownerId: row.owner_id,
        username: row.username,
        display_name: row.display_name,
        profile_title: row.profile_title,
        avatar_url: row.avatar_url,
      },
    };
  } catch (err) {
    console.error(
      `[verifySession.${logPrefix}] Database error while verifying session`,
      err,
    );
    return {
      ok: false,
      statusCode: 500,
      body: {
        error: "Internal server error during authentication.",
        code: "AUTH_SERVER_ERROR",
      },
    };
  }
};

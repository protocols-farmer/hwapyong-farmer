//src/features/auth/verifyAccessToken.ts
import jwt from "jsonwebtoken";
import type { JWTPayload } from "./auth.types.js";
import { isAccessTokenInvalidated } from "./sessionInvalidation.js";

export type AccessTokenVerifyResult =
  | { ok: true; decoded: JWTPayload }
  | {
      ok: false;
      statusCode: number;
      body: { error: string; code: string };
    };

export const verifyAccessToken = async (
  authHeader: string | undefined,
  secret: string,
  logPrefix: string,
): Promise<AccessTokenVerifyResult> => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      statusCode: 401,
      body: { error: "Unauthorized", code: "AUTH_MISSING" },
    };
  }

  const token = authHeader.split(" ")[1];

  let decoded: JWTPayload;
  try {
    decoded = jwt.verify(token as string, secret) as JWTPayload;
    if (decoded.token_use !== "access") throw new Error("Invalid token type");
  } catch (err) {
    const jwtErrName = (err as Error)?.name;
    const jwtErrMsg = (err as Error)?.message || "";
    const isExpired = jwtErrName === "TokenExpiredError";
    const isInvalidSignature =
      jwtErrName === "JsonWebTokenError" || jwtErrMsg === "Invalid token type";

    process.stderr.write(
      `[${logPrefix}] JWT Verify Error name=${jwtErrName} expired=${isExpired} invalid=${isInvalidSignature}: ${jwtErrMsg}\nStack: ${(err as Error).stack}\n`,
    );

    return {
      ok: false,
      statusCode: 401,
      body: {
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
      },
    };
  }

  // Closes the blacklist gap: a valid signature alone used to be enough.
  // Now we also check whether this user has had a revocation event since
  // this specific token was issued.
  const wasInvalidated = await isAccessTokenInvalidated(
    decoded.id,
    decoded.iat,
  );
  if (wasInvalidated) {
    process.stderr.write(
      `[${logPrefix}] Rejected token for user=${decoded.id}: issued before a session-invalidation event.\n`,
    );
    return {
      ok: false,
      statusCode: 401,
      body: {
        error: "Session revoked. Please log in again.",
        code: "SESSION_REVOKED",
      },
    };
  }

  return { ok: true, decoded };
};

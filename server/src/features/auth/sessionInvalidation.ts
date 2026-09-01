//src/features/auth/sessionInvalidation.ts
import { redisClient } from "../../db/redis.js";

const ACCESS_TOKEN_EXPIRY_MINUTES = parseInt(
  process.env["ACCESS_TOKEN_EXPIRY_MINUTES"] || "15",
  10,
);

// Call this whenever a user's access should stop working immediately:
// forced session revocation, password change, role change, or account
// deletion.
export const invalidateUserAccessTokens = async (
  userId: string,
): Promise<void> => {
  try {
    // The TTL only needs to outlive the longest possible access token
    // lifetime — once that much time passes, every token issued before this
    // flag existed has already expired on its own via normal JWT `exp`
    // anyway, so there's no reason to keep this key around forever.
    const ttlSeconds = ACCESS_TOKEN_EXPIRY_MINUTES * 60 + 60;
    const nowSeconds = Math.floor(Date.now() / 1000);
    await redisClient.set(
      `auth:invalidated_after:${userId}`,
      String(nowSeconds),
      { ex: ttlSeconds },
    );
  } catch (err) {
    process.stderr.write(
      `[invalidateUserAccessTokens] RAW REDIS ERROR for user=${userId}: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
    );
  }
};

// Returns true if the given token was issued at or before the user's most
// recent invalidation event. If the Redis check itself fails, this FAILS
// OPEN (returns false) — matching every other Redis-dependent check in this
// codebase (the global rate limiter and the maintenance check in app.ts):
// an unreachable Redis should degrade availability, not silently lock
// everyone out of their own accounts.
export const isAccessTokenInvalidated = async (
  userId: string,
  tokenIssuedAtSeconds: number | undefined,
): Promise<boolean> => {
  if (!tokenIssuedAtSeconds) return false;

  try {
    const invalidatedAfter = await redisClient.get<string>(
      `auth:invalidated_after:${userId}`,
    );
    if (!invalidatedAfter) return false;

    const invalidatedAfterSeconds = parseInt(invalidatedAfter, 10);
    return tokenIssuedAtSeconds <= invalidatedAfterSeconds;
  } catch (err) {
    process.stderr.write(
      `[isAccessTokenInvalidated] RAW REDIS ERROR for user=${userId} (failing open): ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
    );
    return false;
  }
};

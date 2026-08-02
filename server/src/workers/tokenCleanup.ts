//src/workers/tokenCleanup.ts
import { authService } from "../features/auth/auth.service.js";
import { redisClient } from "../db/redis.js";

let consecutiveFailures = 0;

export const startTokenCleanupWorker = () => {
  console.log("🧹  Starting Background Token Cleanup Worker (Redis-Locked)...");

  const CLEANUP_INTERVAL = 1000 * 60 * 60;

  const runCleanupCycle = async () => {
    try {
      let lockAcquired: string | null | unknown = null;

      try {
        lockAcquired = await redisClient.set(
          "cron:token-cleanup-lock",
          "locked",
          {
            nx: true,
            ex: 300,
          },
        );
      } catch (redisErr) {
        consecutiveFailures++;
        process.stderr.write(
          `[CRON_REDIS_DOWN] Token cleanup: Redis lock acquisition failed (consecutive failures=${consecutiveFailures}). Cycle skipped. err=${(redisErr as Error).message}\nStack: ${(redisErr as Error).stack}\n`,
        );
        if (consecutiveFailures >= 5) {
          process.stderr.write(
            `[CRON_CRITICAL] Token cleanup has failed ${consecutiveFailures} consecutive cycles. refresh_tokens table is growing unboundedly. Investigate Redis health immediately.\n`,
          );
        }
        return;
      }

      if (!lockAcquired) {
        consecutiveFailures = 0;
        return;
      }

      try {
        await authService.deleteExpiredRefreshTokens();
        consecutiveFailures = 0;
      } catch (dbErr) {
        consecutiveFailures++;
        process.stderr.write(
          `[CRON_DB_FAIL] Token cleanup: DB query failed (consecutive failures=${consecutiveFailures}). code=${(dbErr as any)?.code || "n/a"} err=${(dbErr as Error).message}\nStack: ${(dbErr as Error).stack}\n`,
        );
        if (consecutiveFailures >= 5) {
          process.stderr.write(
            `[CRON_CRITICAL] Token cleanup has failed ${consecutiveFailures} consecutive cycles on the DB side. refresh_tokens table is growing unboundedly. Investigate PostgreSQL health immediately.\n`,
          );
        }
      }
    } finally {
      setTimeout(runCleanupCycle, CLEANUP_INTERVAL);
    }
  };

  setTimeout(runCleanupCycle, CLEANUP_INTERVAL);
};

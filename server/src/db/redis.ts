//src/db/redis.ts
import { Redis } from "@upstash/redis";

const url = process.env["UPSTASH_REDIS_REST_URL"];
const token = process.env["UPSTASH_REDIS_REST_TOKEN"];

if (!url || !token) {
  process.stderr.write(
    "FATAL ERROR: Upstash REST credentials are not defined in environment variables.\n",
  );
  process.exit(1);
}

export const redisClient = new Redis({
  url: url,
  token: token,
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.ping();
    console.log("🥹  Upstash Redis (REST) reachable and rate limiter active.");
  } catch (err) {
    process.stderr.write(
      JSON.stringify({
        level: "CRITICAL",
        message: "Failed to reach Upstash Redis API",
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      }) + "\n",
    );
  }
};

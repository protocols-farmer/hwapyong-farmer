//src/features/api.routes.ts

import type { IncomingMessage, ServerResponse } from "node:http";
import { pool } from "../db/psql.js";
import { redisClient } from "../db/redis.js";
import { authRoutes } from "./auth/auth.routes.js";
import { adminRoutes } from "./admin/admin.routes.js";
import { postsRoutes } from "./posts/posts.routes.js";

export const apiRoutes = async ({
  req,
  res,
  pathname,
  parseURL,
}: {
  req: IncomingMessage;
  res: ServerResponse;
  pathname: string;
  parseURL: URL;
}): Promise<boolean> => {
  if (pathname === "/api/v1/health" && req.method === "GET") {
    try {
      await Promise.all([pool.query("SELECT 1"), redisClient.ping()]);

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (err: any) {
      process.stderr.write(
        JSON.stringify({
          level: "ERROR",
          context: "Health Check Failure",
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        }) + "\n",
      );

      process.stderr.write(
        `[HEALTH_CRASH_DUMP] ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}\n`,
      );

      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          status: "unhealthy",
          error: "Core dependency failure",
        }),
      );
    }
    return true;
  }

  const authHandled = await authRoutes({ req, res, pathname });
  if (authHandled) return true;

  const adminHandled = await adminRoutes({ req, res, pathname, parseURL });
  if (adminHandled) return true;

  const postsHandled = await postsRoutes({ req, res, pathname, parseURL });
  if (postsHandled) return true;

  return false;
};

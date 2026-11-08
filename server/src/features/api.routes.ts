//src/features/api.routes.ts

import type { IncomingMessage, ServerResponse } from "node:http";
import { pool } from "../db/psql.js";
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
    res.setHeader("Cache-Control", "no-store");

    try {
      await pool.query("SELECT 1");

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (err) {
      console.error("[api.routes.health] Postgres health check failed", err);

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

  const adminHandled = await adminRoutes({ req, res, pathname });
  if (adminHandled) return true;

  const postsHandled = await postsRoutes({ req, res, pathname, parseURL });
  if (postsHandled) return true;

  return false;
};

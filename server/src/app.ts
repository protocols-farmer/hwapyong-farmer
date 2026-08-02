//src/app.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { apiRoutes } from "./features/api.routes.js";
import { redisClient } from "./db/redis.js";
import jwt from "jsonwebtoken";
import type { JWTPayload } from "./features/auth/auth.types.js";

const ACCESS_TOKEN_SECRET = process.env["ACCESS_TOKEN_SECRET"];
const rawAllowedOrigins = process.env["CLIENT_URL"];

if (!ACCESS_TOKEN_SECRET || !rawAllowedOrigins) {
  process.stderr.write(
    "FATAL ERROR: Environment variables ACCESS_TOKEN_SECRET or CLIENT_URL missing.\n",
  );
  process.exit(1);
}

const allowedOrigins = rawAllowedOrigins.split(",").map((o) => o.trim());

export const app = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const startTime = process.hrtime();

  const origin = req.headers.origin || "";
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, GET, PUT, DELETE, OPTIONS, PATCH",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ${rawAllowedOrigins.replace(/,/g, " ")}`,
  );

  res.on("finish", () => {
    try {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const durationInMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);
      const log = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${durationInMs}ms`,
        ip: String(
          req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        ).split(",")[0],
        userAgent: req.headers["user-agent"],
      };
      process.stdout.write(JSON.stringify(log) + "\n");
    } catch {}
  });

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const ip =
    String(req.headers["x-forwarded-for"] || req.socket.remoteAddress).split(
      ",",
    )[0] || "unknown_ip";
  const redisKey = `ratelimit:global:${ip}`;

  if (process.env["NODE_ENV"] !== "development") {
    try {
      const currentCount = await redisClient.incr(redisKey);
      if (currentCount === 1) {
        await redisClient.expire(redisKey, 60);
      }

      if (currentCount > 500) {
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Too many requests. Slow down bro." }));
        return;
      }
    } catch (err) {
      process.stderr.write(
        `[REDIS_NETWORK_WARN] Rate limiter bypassed due to offline status: ${(err as Error).message}\n`,
      );
    }
  }

  let isMaintenance = "false";
  try {
    const maintenanceRes = await redisClient.get<string>("maintenance:status");
    isMaintenance = maintenanceRes || "false";
  } catch (err) {
    process.stderr.write(
      `[REDIS_NETWORK_WARN] Maintenance check bypassed due to offline status: ${(err as Error).message}\n`,
    );
  }

  if (isMaintenance === "true") {
    const authHeader = req.headers.authorization;
    let isSuperAdmin = false;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];

        if (!token) throw new Error("Missing token string");

        const decoded = jwt.verify(
          token,
          ACCESS_TOKEN_SECRET as string,
        ) as unknown as JWTPayload;

        if (decoded.role === "super_admin" && decoded.token_use === "access") {
          isSuperAdmin = true;
        }
      } catch (err) {
        process.stderr.write(
          `[MAINTENANCE] Token Verify Error: ${(err as Error).message}\n`,
        );
      }
    }

    if (!isSuperAdmin) {
      let message = "The Lab is undergoing critical updates.";

      try {
        const customMessage = await redisClient.get<string>(
          "maintenance:message",
        );
        if (customMessage) message = customMessage;
      } catch (err) {}

      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Maintenance Mode Active", message }));
      return;
    }
  }

  if (["POST", "PATCH", "PUT"].includes(req.method || "")) {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);

    if (contentLength > 1024 * 1024) {
      res.statusCode = 413;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Payload too large. Max 1MB allowed for JSON.",
        }),
      );
      return;
    }
  }

  const protocol = (req.socket as any).encrypted ? "https" : "http";
  const baseURL = `${protocol}://${req.headers.host || "localhost"}`;
  const parseURL = new URL(req.url || "/", baseURL);
  const { pathname } = parseURL;

  if (pathname === "/") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Rotten Lab API is Online" }));
    return;
  }

  try {
    const handled = await apiRoutes({ req, res, pathname, parseURL });
    if (!handled && !res.headersSent) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Route not found" }));
    }
  } catch (err) {
    process.stderr.write(
      JSON.stringify({
        level: "FATAL",
        context: "Request Handling Error",
        error: (err as Error).message,
      }) + "\n",
    );
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  }
};

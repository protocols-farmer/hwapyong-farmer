//src/app.ts

import type { IncomingMessage, ServerResponse } from "node:http";
import { apiRoutes } from "./features/api.routes.js";
import { verifySession } from "./features/auth/verifySession.js";
import { maintenanceState } from "./state/maintenance.js";
import { ALLOWED_ORIGINS, TRUSTED_PROXY_HOPS } from "./config/env.js";

console.log("🥹  Allowed CORS origins:", ALLOWED_ORIGINS);

export const app = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const startTime = process.hrtime();

  const origin = req.headers.origin || "";
  res.setHeader("Vary", "Origin");
  if (ALLOWED_ORIGINS.includes(origin)) {
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

  res.on("finish", () => {
    try {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const durationInMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

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

      const log = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${durationInMs}ms`,
        ip: clientIp,
        userAgent: req.headers["user-agent"],
      };
      process.stdout.write(JSON.stringify(log) + "\n");
    } catch (err) {
      console.error("[app.finish] Request log write failed", err);
    }
  });

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const protocol = (req.socket as any).encrypted ? "https" : "http";
  const baseURL = `${protocol}://${req.headers.host || "localhost"}`;
  const parseURL = new URL(req.url || "/", baseURL);

  const { pathname } = parseURL;

  const isPublicReadRoute =
    req.method === "GET" &&
    (pathname === "/api/v1/posts/filter" ||
      pathname.startsWith("/api/v1/posts/getone/") ||
      pathname === "/api/v1/posts/tags" ||
      pathname === "/api/v1/auth/profile" ||
      pathname === "/api/v1/admin/maintenance");

  if (isPublicReadRoute && !req.headers.authorization) {
    res.setHeader("Cache-Control", "no-cache");
  } else {
    res.setHeader("Cache-Control", "no-store");
  }

  if (maintenanceState.isMaintenance) {
    const isAlwaysAllowed =
      pathname === "/" ||
      (pathname === "/api/v1/health" && req.method === "GET") ||
      (pathname === "/api/v1/auth/login" && req.method === "POST") ||
      (pathname === "/api/v1/auth/me" && req.method === "GET") ||
      (pathname === "/api/v1/admin/maintenance" && req.method === "GET");

    if (!isAlwaysAllowed) {
      const verifyResult = await verifySession(
        req.headers.authorization,
        "maintenanceGate",
      );

      if (!verifyResult.ok) {
        res.statusCode = 503;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Maintenance Mode Active",
            message: maintenanceState.message,
          }),
        );
        return;
      }
    }
  }

  if (["POST", "PATCH", "PUT"].includes(req.method || "")) {
    const isExemptUploadRoute =
      pathname === "/api/v1/auth/upload-avatar" ||
      pathname === "/api/v1/posts/upload";

    if (!isExemptUploadRoute) {
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
  }

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
    console.error("[app.request] Unhandled request handling error", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  }
};

//src/server.ts
import http from "node:http";
import { promisify, inspect } from "node:util";
import { PORT, HOST } from "./config/env.js";
import { app } from "./app.js";
import { connectWithRetry, pool } from "./db/psql.js";
import { verifyCloudinary } from "./db/cloudinary.js";
import { startCloudinaryCleanupWorker } from "./workers/cloudinaryCleanup.js";
import { maintenanceState } from "./state/maintenance.js";

const server = http.createServer(app);

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 30000;

const closeServer = promisify(server.close.bind(server));

let isShuttingDown = false;

const performGracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🫩  Received ${signal}. Starting graceful shutdown...`);

  const forceExit = setTimeout(() => {
    process.stderr.write(
      JSON.stringify({
        level: "FATAL",
        message: "Shutdown timed out, forcing exit",
        timestamp: new Date().toISOString(),
      }) + "\n",
    );
    process.exit(1);
  }, 10000);

  try {
    console.log("🫩  Closing HTTP server (waiting for active requests)...");
    await closeServer();

    console.log("🫩  Closing Postgres DB connection pool...");
    await pool.end();

    console.log("🫩  All services closed. Goodbye!");
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    console.error("[server.performGracefulShutdown] Shutdown error", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => performGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => performGracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error(
    "[server.unhandledRejection] Unhandled promise rejection",
    reason,
  );
});

process.on("uncaughtException", (err) => {
  console.error("[server.uncaughtException] Uncaught exception, exiting", err);
  process.exit(1);
});

const startServer = async () => {
  try {
    console.log("🥹  Initializing Production Environment...");

    await verifyCloudinary();
    await connectWithRetry();

    try {
      const settingsRes = await pool.query(
        "SELECT is_maintenance, maintenance_message FROM system_settings WHERE id = 1;",
      );
      if (settingsRes.rows.length > 0) {
        maintenanceState.isMaintenance = Boolean(
          settingsRes.rows[0].is_maintenance,
        );
        maintenanceState.message = String(
          settingsRes.rows[0].maintenance_message ||
            "The site is under maintenance. Please check back soon.",
        );
        console.log(
          `🥹  Maintenance state loaded (isMaintenance=${maintenanceState.isMaintenance}).`,
        );
      }
    } catch (settingsErr) {
      maintenanceState.isMaintenance = false;
      console.error(
        "[server.startServer] Failed to read system_settings on startup; defaulting maintenance mode to OFF",
        settingsErr,
      );
    }

    startCloudinaryCleanupWorker();

    server.listen(PORT, HOST, () => {
      console.log(`🥹  Server listening on http://${HOST}:${PORT}`);
    });
  } catch (error) {
    process.stderr.write(
      "[server.startServer] Fatal startup error:\n" +
        inspect(error, { depth: null }) +
        "\n",
    );
    process.exit(1);
  }
};

startServer();

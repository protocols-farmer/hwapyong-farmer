//src/server.ts
import http from "node:http";
import { promisify } from "node:util";
import { app } from "./app.js";
import { connectWithRetry, pool } from "./db/psql.js";
import { connectRedis } from "./db/redis.js";
import { verifyCloudinary } from "./db/cloudinary.js";
import { startTokenCleanupWorker } from "./workers/tokenCleanup.js";
const PORT = process.env["PORT"] || "5000";
const HOST = process.env["HOST"] || "0.0.0.0";

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

    console.log("🫩  Closing Redis connection...");

    console.log("🫩  All services closed. Goodbye!");
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err: any) {
    process.stderr.write(
      JSON.stringify({
        level: "ERROR",
        context: "Shutdown",
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      }) + "\n",
    );
    process.exit(1);
  }
};

process.on("SIGINT", () => performGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => performGracefulShutdown("SIGTERM"));

const startServer = async () => {
  try {
    console.log("🥹  Initializing Production Environment...");

    await verifyCloudinary();
    await connectWithRetry();
    await connectRedis();

    startTokenCleanupWorker();

    server.listen(parseInt(PORT, 10), HOST, () => {
      console.log(`🥹  Server listening on http://${HOST}:${PORT}`);
    });
  } catch (error: any) {
    const extractMessage = (err: any): string => {
      if (!err) return "Unknown error";
      if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        return err.errors[0].message || err.message;
      }
      return err.message || "No message provided";
    };

    const rootCause = error.cause
      ? extractMessage(error.cause)
      : "No underlying cause";

    const fatalLog = {
      level: "FATAL",
      message: error.message,
      root_cause: rootCause,
      code: error.cause?.code || error.cause?.errors?.[0]?.code,
      timestamp: new Date().toISOString(),
    };

    process.stderr.write(JSON.stringify(fatalLog) + "\n");

    console.error(`🫩  Fatal startup error: ${error.message}`);
    console.error(`🫩  Root Cause: ${rootCause}`);

    process.exit(1);
  }
};

startServer();

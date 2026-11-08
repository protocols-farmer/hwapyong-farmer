//src/db/psql.ts
import net from "node:net";
import pg from "pg";
import { DATABASE_URL, DATABASE_CA_CERT, DATABASE_SSL } from "../config/env.js";

net.setDefaultAutoSelectFamilyAttemptTimeout(5000);

const { Pool } = pg;

let sslConfig: pg.PoolConfig["ssl"];

if (DATABASE_SSL === "off") {
  sslConfig = undefined;
} else if (DATABASE_SSL === "verify") {
  if (DATABASE_CA_CERT) {
    sslConfig = { rejectUnauthorized: true, ca: DATABASE_CA_CERT };
    console.log(
      "🥹  Postgres SSL: verifying server certificate against DATABASE_CA_CERT.",
    );
  } else {
    sslConfig = { rejectUnauthorized: true };
    console.log(
      "🥹  Postgres SSL: verifying server certificate against system CAs.",
    );
  }
} else {
  sslConfig = { rejectUnauthorized: false };
  console.warn(
    "⚠️  WARNING: Postgres SSL certificate verification is disabled (DATABASE_SSL=no-verify). Any certificate is accepted.",
  );
}

const poolConfig: pg.PoolConfig = {
  connectionString: DATABASE_URL,
  ssl: sslConfig,

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000,
  query_timeout: 10000,
};

export const pool = new Pool(poolConfig);

pool.on("error", (err: Error) => {
  console.error(
    `[psql.pool] Unexpected error on idle PostgreSQL client (total=${pool.totalCount} idle=${pool.idleCount} waiting=${pool.waitingCount})`,
    err,
  );
});

export const connectWithRetry = async (maxRetries = 5): Promise<boolean> => {
  let lastError: Error | null = null;

  for (let i = 1; i <= maxRetries; i++) {
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      console.log("🥹  Database connected and ready.");
      return true;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const delay = Math.pow(2, i - 1) * 1000 + Math.random() * 1000;

      console.error(
        `[psql.connectWithRetry] Database connection failed (attempt ${i}/${maxRetries})`,
        err,
      );
      if (i === maxRetries) break;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("🫩  Max retries reached. Database is unreachable.", {
    cause: lastError,
  });
};

//src/db/psql.ts
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  process.stderr.write(
    "FATAL ERROR: DATABASE_URL is not defined in environment variables.\n",
  );
  process.exit(1);
}

const poolConfig: pg.PoolConfig = {
  connectionString: connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  query_timeout: 10000,
};

export const pool = new Pool(poolConfig);

pool.on("error", (err: Error) => {
  process.stderr.write(
    JSON.stringify({
      level: "FATAL",
      message: "Unexpected error on idle PostgreSQL client",
      error: err.message,
      code: (err as any).code,
      stack: err.stack,
      poolTotal: pool.totalCount,
      poolIdle: pool.idleCount,
      poolWaiting: pool.waitingCount,
      timestamp: new Date().toISOString(),
    }) + "\n",
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

      process.stderr.write(
        JSON.stringify({
          level: "ERROR",
          attempt: i,
          message: "Database connection failed",
          code: (err as any).code,
          detail: (err as any).detail,
          stack: lastError.stack,
          timestamp: new Date().toISOString(),
        }) + "\n",
      );

      if (i === maxRetries) break;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("🫩  Max retries reached. Database is unreachable.", {
    cause: lastError,
  });
};

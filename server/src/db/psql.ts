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

const isProduction = process.env["NODE_ENV"] === "production";

// #12 fix: rejectUnauthorized: false silently accepted ANY certificate,
// which defeats the point of SSL. This is now explicit instead of a silent
// default:
// - Set DATABASE_CA_CERT to the CA certificate PEM from your Render
//   Postgres dashboard (Database → Connections → CA Certificate) to get
//   full certificate verification.
// - Without it, this falls back to the old behavior but now WARNS loudly
//   at startup instead of doing it silently.
// - DATABASE_SSL_REJECT_UNAUTHORIZED=true silences that warning if you've
//   consciously decided to accept the tradeoff.
const databaseCaCert = process.env["DATABASE_CA_CERT"];
const explicitRejectUnauthorized =
  process.env["DATABASE_SSL_REJECT_UNAUTHORIZED"];

let sslConfig: pg.PoolConfig["ssl"];

if (!isProduction) {
  sslConfig = undefined;
} else if (databaseCaCert) {
  sslConfig = { rejectUnauthorized: true, ca: databaseCaCert };
  console.log(
    "🥹  Postgres SSL: verifying server certificate against DATABASE_CA_CERT.",
  );
} else if (explicitRejectUnauthorized === "true") {
  sslConfig = { rejectUnauthorized: false };
  process.stderr.write(
    "⚠️  WARNING: Postgres SSL certificate verification is explicitly disabled (DATABASE_SSL_REJECT_UNAUTHORIZED=true). This accepts any certificate. Set DATABASE_CA_CERT instead if possible.\n",
  );
} else {
  sslConfig = { rejectUnauthorized: false };
  process.stderr.write(
    "⚠️  WARNING: DATABASE_CA_CERT is not set — falling back to rejectUnauthorized: false, which accepts any certificate. Get your database's CA certificate from Render's dashboard (Database → Connections → CA Certificate) and set it as DATABASE_CA_CERT to fix this properly.\n",
  );
}

const poolConfig: pg.PoolConfig = {
  connectionString: connectionString,
  ssl: sslConfig,

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

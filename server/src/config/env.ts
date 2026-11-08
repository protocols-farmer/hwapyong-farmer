const rawPort = process.env["PORT"]?.trim() || "";
export const PORT = parseInt(rawPort, 10);
export const HOST = process.env["HOST"]?.trim() || "";

export const NODE_ENV = process.env["NODE_ENV"]?.trim() || "";

export const IS_DEV = NODE_ENV === "development";

export const CLIENT_URL = process.env["CLIENT_URL"]?.trim() || "";

export const ALLOWED_ORIGINS = CLIENT_URL.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const rawTrustedProxyHops = process.env["TRUSTED_PROXY_HOPS"]?.trim() || "";
export const TRUSTED_PROXY_HOPS = parseInt(rawTrustedProxyHops, 10);

export const DATABASE_URL = process.env["DATABASE_URL"]?.trim() || "";

export const DATABASE_SSL = process.env["DATABASE_SSL"]?.trim() || "";

export const DATABASE_CA_CERT = process.env["DATABASE_CA_CERT"]?.trim() || "";

export const CLOUDINARY_CLOUD_NAME =
  process.env["CLOUDINARY_CLOUD_NAME"]?.trim() || "";
export const CLOUDINARY_API_KEY =
  process.env["CLOUDINARY_API_KEY"]?.trim() || "";
export const CLOUDINARY_API_SECRET =
  process.env["CLOUDINARY_API_SECRET"]?.trim() || "";

export const CLOUDINARY_CLEANUP_DRY_RUN =
  process.env["CLOUDINARY_CLEANUP_DRY_RUN"]?.trim() || "";

const rawSessionExpiryDays = process.env["SESSION_EXPIRY_DAYS"]?.trim() || "";
export const SESSION_EXPIRY_DAYS = parseInt(rawSessionExpiryDays, 10);

const rawLoginFailLimit = process.env["LOGIN_FAIL_LIMIT"]?.trim() || "";
export const LOGIN_FAIL_LIMIT = parseInt(rawLoginFailLimit, 10);

const rawLoginLockMinutes = process.env["LOGIN_LOCK_MINUTES"]?.trim() || "";
export const LOGIN_LOCK_MINUTES = parseInt(rawLoginLockMinutes, 10);

const missingVariables: string[] = [];

if (!/^\d+$/.test(rawPort) || Number.isNaN(PORT) || PORT < 1 || PORT > 65535) {
  missingVariables.push("PORT (must be an integer between 1 and 65535)");
}
if (!HOST) missingVariables.push("HOST");
if (
  NODE_ENV !== "development" &&
  NODE_ENV !== "production" &&
  NODE_ENV !== "test"
) {
  missingVariables.push(
    'NODE_ENV (must be exactly "development", "production" or "test")',
  );
}

if (!CLIENT_URL || ALLOWED_ORIGINS.length === 0) {
  missingVariables.push("CLIENT_URL");
}

if (
  !/^\d+$/.test(rawTrustedProxyHops) ||
  Number.isNaN(TRUSTED_PROXY_HOPS) ||
  TRUSTED_PROXY_HOPS < 0
) {
  missingVariables.push(
    "TRUSTED_PROXY_HOPS (must be a whole number 0 or more)",
  );
}

if (!DATABASE_URL) missingVariables.push("DATABASE_URL");
if (
  DATABASE_SSL !== "off" &&
  DATABASE_SSL !== "verify" &&
  DATABASE_SSL !== "no-verify"
) {
  missingVariables.push(
    'DATABASE_SSL (must be exactly "off", "verify" or "no-verify")',
  );
}

if (!CLOUDINARY_CLOUD_NAME) missingVariables.push("CLOUDINARY_CLOUD_NAME");
if (!CLOUDINARY_API_KEY) missingVariables.push("CLOUDINARY_API_KEY");
if (!CLOUDINARY_API_SECRET) missingVariables.push("CLOUDINARY_API_SECRET");
if (
  CLOUDINARY_CLEANUP_DRY_RUN !== "true" &&
  CLOUDINARY_CLEANUP_DRY_RUN !== "false"
) {
  missingVariables.push(
    'CLOUDINARY_CLEANUP_DRY_RUN (must be exactly "true" or "false")',
  );
}

if (
  !/^\d+$/.test(rawSessionExpiryDays) ||
  Number.isNaN(SESSION_EXPIRY_DAYS) ||
  SESSION_EXPIRY_DAYS < 1
) {
  missingVariables.push("SESSION_EXPIRY_DAYS (must be an integer 1 or more)");
}
if (
  !/^\d+$/.test(rawLoginFailLimit) ||
  Number.isNaN(LOGIN_FAIL_LIMIT) ||
  LOGIN_FAIL_LIMIT < 1
) {
  missingVariables.push("LOGIN_FAIL_LIMIT (must be an integer 1 or more)");
}
if (
  !/^\d+$/.test(rawLoginLockMinutes) ||
  Number.isNaN(LOGIN_LOCK_MINUTES) ||
  LOGIN_LOCK_MINUTES < 1
) {
  missingVariables.push("LOGIN_LOCK_MINUTES (must be an integer 1 or more)");
}

if (missingVariables.length > 0) {
  console.error(
    "[ENV FATAL] Server failed to start due to missing or invalid environment variables:",
    missingVariables,
  );
  process.exit(1);
}

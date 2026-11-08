//src/scripts/setOwner.ts
import { inspect } from "node:util";
import argon2 from "argon2";
import { pool } from "../db/psql.js";

const runSetOwner = async (): Promise<void> => {
  const rawUsername = process.argv[2]?.trim() || "";
  const rawPassword = process.argv[3] || "";
  const providedDisplayName = process.argv[4]?.trim() || "";
  const rawDisplayName = providedDisplayName || rawUsername;
  if (!rawUsername || !rawPassword) {
    process.stderr.write(
      "Usage: npm run set-owner -- <username> <password> [display_name]\n",
    );
    process.exit(1);
  }

  if (rawUsername.length < 3 || rawUsername.length > 20) {
    process.stderr.write("Error: Username must be 3-20 characters.\n");
    process.exit(1);
  }

  const usernameAllowList = /^[a-zA-Z0-9_]+$/;
  if (!usernameAllowList.test(rawUsername)) {
    process.stderr.write(
      "Error: Username can only contain letters, numbers, and underscores.\n",
    );
    process.exit(1);
  }

  if (rawPassword.length < 6 || rawPassword.length > 50) {
    process.stderr.write("Error: Password must be 6-50 characters.\n");
    process.exit(1);
  }

  if (rawDisplayName.length < 2 || rawDisplayName.length > 50) {
    process.stderr.write("Error: Display name must be 2-50 characters.\n");
    process.exit(1);
  }

  let passwordHash = "";
  try {
    passwordHash = await argon2.hash(rawPassword);
  } catch (err) {
    process.stderr.write(inspect(err, { depth: null }) + "\n");
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    const existingResult = await client.query(
      "SELECT id FROM profile LIMIT 1;",
    );

    if (existingResult.rows.length === 0) {
      const insertSql = `
        INSERT INTO profile (username, display_name, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, display_name, profile_title, avatar_url, created_at, updated_at;
      `;
      const inserted = await client.query(insertSql, [
        rawUsername,
        rawDisplayName,
        passwordHash,
      ]);
      console.log("Owner profile created:", inserted.rows[0]);
    } else {
      const updateSql = `
        UPDATE profile
        SET username = $1,
            display_name = COALESCE($2, display_name),
            password_hash = $3,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id, username, display_name, profile_title, avatar_url, updated_at;
      `;
      const updated = await client.query(updateSql, [
        rawUsername,
        providedDisplayName === "" ? null : providedDisplayName,
        passwordHash,
      ]);
      await client.query("DELETE FROM sessions;");
      console.log(
        "Owner profile updated and all existing sessions cleared:",
        updated.rows[0],
      );
    }

    await client.query("COMMIT;");
  } catch (err) {
    try {
      await client.query("ROLLBACK;");
    } catch (rollbackErr) {
      console.error("[setOwner.runSetOwner] Rollback failed", rollbackErr);
    }
    process.stderr.write(inspect(err, { depth: null }) + "\n");
    process.exit(1);
  } finally {
    client.release();
    try {
      await pool.end();
    } catch (poolEndErr) {
      console.error("[setOwner.runSetOwner] Pool close failed", poolEndErr);
    }
  }
};

runSetOwner();

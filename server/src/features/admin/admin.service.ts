//src/features/admin/admin.service.ts
import { redisClient } from "../../db/redis.js";
import { pool } from "../../db/psql.js";
import type { UserRole } from "../auth/auth.types.js";
import type { SecurityBanDTO } from "./admin.types.js";
import { invalidateUserAccessTokens } from "../auth/sessionInvalidation.js";

export const adminService = {
  async getUserById(userId: string) {
    try {
      const sql = `
        SELECT id, username, role 
        FROM users 
        WHERE id = $1;
      `;
      return await pool.query(sql, [userId]);
    } catch (error) {
      process.stderr.write(
        `[adminService.getUserById] RAW ERROR: ${(error as Error).message}\nStack: ${(error as Error).stack}\n`,
      );

      throw error;
    }
  },

  async getAllUsers(page: number = 1, limit: number = 25) {
    try {
      const offset = (page - 1) * limit;

      const countSql = `SELECT COUNT(*) FROM users;`;
      const dataSql = `
        SELECT id, username, role, created_at, updated_at
        FROM users 
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
      `;

      const [countRes, dataRes] = await Promise.all([
        pool.query(countSql),
        pool.query(dataSql, [limit, offset]),
      ]);

      return {
        rows: dataRes.rows,
        totalCount: parseInt(countRes.rows[0]?.count || "0", 10),
      };
    } catch (error) {
      process.stderr.write(
        `[adminService.getAllUsers] RAW ERROR: ${(error as Error).message}\nStack: ${(error as Error).stack}\n`,
      );

      throw error;
    }
  },

  // #1 + #4 fix: this used to be a single un-transacted query with no audit
  // trail. Role changes are the most security-sensitive action in this whole
  // file, so it now (a) writes an audit log entry, and (b) wraps both writes
  // in a real transaction — using a single checked-out client via
  // pool.connect(), not pool.query(), since pool.query() borrows a different
  // connection per call and BEGIN/COMMIT on separate connections do nothing.
  async updateUserRole(userId: string, newRole: UserRole, adminId: string) {
    const client = await pool.connect();
    let result;

    try {
      await client.query("BEGIN;");

      const sql = `
        UPDATE users 
        SET role = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 
        RETURNING id, username, role;
      `;
      result = await client.query(sql, [newRole, userId]);

      const logSql = `
        INSERT INTO audit_logs (admin_id, admin_username, action, details)
        SELECT $1, username, 'ROLE_CHANGED', 'Changed role of User ID: ' || $2 || ' to ' || $3 
        FROM users 
        WHERE id = $1;
      `;
      await client.query(logSql, [adminId, userId, newRole]);

      await client.query("COMMIT;");
    } catch (error) {
      await client.query("ROLLBACK;");
      process.stderr.write(
        `[adminService.updateUserRole] RAW ERROR: ${(error as Error).message}\nStack: ${(error as Error).stack}\n`,
      );
      client.release();
      throw error;
    }

    client.release();

    // #10 fix: an access token issued before this change keeps its OLD
    // role baked into the JWT payload until it naturally expires.
    // Invalidating here makes the change take effect on the very next
    // request, not up to ~15 minutes later.
    await invalidateUserAccessTokens(userId);

    return result;
  },

  // #1 fix: pool.query("BEGIN")/pool.query("COMMIT") each grab a DIFFERENT
  // connection from the pool — they were never actually transacting anything.
  // Every statement auto-committed the instant it ran, so a failure after the
  // DELETE (e.g. the audit-log INSERT throwing) would report "failed" to the
  // admin while the user was, in fact, already deleted with no log of it.
  // Using one checked-out client for BEGIN/.../COMMIT/ROLLBACK fixes this.
  async deleteUser(userId: string, adminId: string) {
    const client = await pool.connect();
    let deleteResult;

    try {
      await client.query("BEGIN;");

      deleteResult = await client.query("DELETE FROM users WHERE id = $1", [
        userId,
      ]);

      const logSql = `
        INSERT INTO audit_logs (admin_id, admin_username, action, details)
        SELECT $1, username, 'USER_DELETED', 'Permanently deleted User ID: ' || $2 
        FROM users 
        WHERE id = $1;
      `;
      await client.query(logSql, [adminId, userId]);

      await client.query("COMMIT;");
    } catch (error) {
      await client.query("ROLLBACK;");

      process.stderr.write(
        `[adminService.deleteUser] RAW ERROR: ${(error as Error).message}\nStack: ${(error as Error).stack}\n`,
      );

      client.release();
      throw error;
    }

    client.release();

    // Closes off any lingering trust in a still-valid access token for an
    // account whose row no longer exists (e.g. app.ts's maintenance-bypass
    // check only decodes the JWT and never re-checks the DB).
    await invalidateUserAccessTokens(userId);

    return deleteResult;
  },

  async getAuditLogs(
    searchQuery?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const offset = (page - 1) * limit;

      if (searchQuery) {
        // Switched from plainto_tsquery to websearch_to_tsquery so log
        // search supports the same quoting/boolean syntax as post search
        // (postsService.getFilteredPosts) instead of a weaker, inconsistent
        // parser here.
        const sql = `
          SELECT id, admin_id, admin_username, action, details, created_at,
                 count(*) OVER() AS full_count
          FROM audit_logs 
          WHERE search_vector @@ websearch_to_tsquery('english', $1)
          ORDER BY created_at DESC 
          LIMIT $2 OFFSET $3;
        `;
        return await pool.query(sql, [searchQuery, limit, offset]);
      }

      const sql = `
        SELECT id, admin_id, admin_username, action, details, created_at,
               count(*) OVER() AS full_count
        FROM audit_logs 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2;
      `;
      return await pool.query(sql, [limit, offset]);
    } catch (error) {
      process.stderr.write(
        `[adminService.getAuditLogs] RAW ERROR: ${(error as Error).message}\nStack: ${(error as Error).stack}\n`,
      );

      throw error;
    }
  },

  async getSystemSettings() {
    try {
      const sql = `SELECT is_maintenance, maintenance_message FROM system_settings WHERE id = 1;`;
      return await pool.query(sql);
    } catch (error) {
      process.stderr.write(
        `[adminService.getSystemSettings] RAW ERROR: ${(error as Error).message}\nStack: ${(error as Error).stack}\n`,
      );

      throw error;
    }
  },

  // #1 + #6 fix: same fake-transaction problem as deleteUser, fixed the same
  // way with a single checked-out client. Separately: Postgres and Redis
  // can't share one transaction, so even with the DB write now genuinely
  // atomic, a Redis failure AFTER the DB commits can still leave the DB row
  // and the live maintenance gate (app.ts reads Redis only) out of sync.
  // Rather than pretend that can't happen, we report it explicitly via
  // `redisSyncFailed` so the controller can tell the admin the truth instead
  // of a blanket "failed" when the setting actually did save.
  async updateSystemSettings(
    isMaintenance: boolean,
    message: string,
    adminId: string,
  ) {
    const client = await pool.connect();
    let result;

    try {
      await client.query("BEGIN;");

      const settingsSql = `
        UPDATE system_settings 
        SET is_maintenance = $1, maintenance_message = $2, updated_by = $3
        WHERE id = 1
        RETURNING is_maintenance, maintenance_message, updated_at;
      `;
      result = await client.query(settingsSql, [
        isMaintenance,
        message,
        adminId,
      ]);

      const logDetails = `Maintenance: ${isMaintenance}, Msg: ${message}`;

      const logSql = `
        INSERT INTO audit_logs (admin_id, admin_username, action, details)
        SELECT $1, username, 'SYSTEM_SETTINGS_UPDATED', $2 
        FROM users 
        WHERE id = $1;
      `;
      await client.query(logSql, [adminId, logDetails]);

      await client.query("COMMIT;");
    } catch (error) {
      await client.query("ROLLBACK;");

      process.stderr.write(
        `[adminService.updateSystemSettings] RAW DB ERROR: ${(error as Error).message}\nStack: ${(error as Error).stack}\n`,
      );

      client.release();
      throw error;
    }

    client.release();

    let redisSyncFailed = false;
    try {
      await redisClient.set(
        "maintenance:status",
        isMaintenance ? "true" : "false",
      );
      await redisClient.set("maintenance:message", message);
    } catch (redisError) {
      redisSyncFailed = true;
      process.stderr.write(
        `[adminService.updateSystemSettings] RAW REDIS ERROR (DB already committed — live gate may now be stale): ${(redisError as Error).message}\nStack: ${(redisError as Error).stack}\n`,
      );
    }

    return { result, redisSyncFailed };
  },

  async revokeAllUserSessions(targetUserId: string, adminId: string) {
    const client = await pool.connect();
    let rowCount;

    try {
      await client.query("BEGIN;");

      const deleteSql = `DELETE FROM refresh_tokens WHERE user_id = $1 RETURNING id;`;
      const result = await client.query(deleteSql, [targetUserId]);
      rowCount = result.rowCount;

      const logSql = `
        INSERT INTO audit_logs (admin_id, admin_username, action, details)
        SELECT $1, username, 'SESSIONS_REVOKED', 'Terminated ' || $3 || ' active sessions for User ID: ' || $2 
        FROM users 
        WHERE id = $1;
      `;
      await client.query(logSql, [adminId, targetUserId, rowCount]);

      await client.query("COMMIT;");
    } catch (error) {
      await client.query("ROLLBACK;");

      process.stderr.write(
        `[adminService.revokeAllUserSessions] RAW ERROR: ${(error as Error).message}\nStack: ${(error as Error).stack}\n`,
      );

      client.release();
      throw error;
    }

    client.release();

    // #10 fix: this is the actual point of "revoke all sessions." Deleting
    // refresh tokens alone only stopped FUTURE renewal — the user's current
    // access token kept working for up to ~15 more minutes. This makes the
    // termination take effect immediately.
    await invalidateUserAccessTokens(targetUserId);

    return rowCount;
  },

  // NEW
  async getActiveSecurityBans(): Promise<SecurityBanDTO[]> {
    try {
      const ipBanKeys: string[] = [];
      let cursor: string = "0";

      do {
        // Explicit cast breaks a circular-inference issue: cursor's
        // reassignment at the end of each loop pass depends on nextCursor,
        // which depends on scanResult, which depends on cursor's type going
        // in — TS can't resolve that loop on its own (TS7022). The cast
        // pins the shape down using what Upstash's docs confirm scan()
        // actually returns: a [nextCursor, matchedKeys] tuple.
        const scanResult = (await redisClient.scan(cursor, {
          match: "ratelimit:login:ban:ip:*",
          count: 100,
        })) as [string, string[]];

        if (!Array.isArray(scanResult) || scanResult.length !== 2) {
          process.stderr.write(
            `[adminService.getActiveSecurityBans] Unexpected scan() reply shape: ${JSON.stringify(scanResult)}\n`,
          );
          break;
        }

        const [nextCursor, matchedKeys] = scanResult;
        cursor = nextCursor;
        ipBanKeys.push(...matchedKeys);
      } while (cursor !== "0");

      const bans: SecurityBanDTO[] = [];

      for (const key of ipBanKeys) {
        const ttl = await redisClient.ttl(key);
        if (ttl > 0) {
          bans.push({
            key,
            type: "IP",
            target: key.split(":").pop() || "unknown",
            remainingSeconds: ttl,
          });
        }
      }

      return bans.sort((a, b) => b.remainingSeconds - a.remainingSeconds);
    } catch (error) {
      process.stderr.write(
        `[adminService.getActiveSecurityBans] RAW ERROR: ${(error as Error).message}\nStack: ${(error as Error).stack}\n`,
      );

      throw error;
    }
  },

  async liftSecurityBan(redisKey: string, adminId: string) {
    try {
      if (!redisKey.startsWith("ratelimit:login:ban:")) {
        throw new Error("Invalid key protocol. Only ban keys can be lifted.");
      }

      const deletedCount = await redisClient.del(redisKey);

      if (deletedCount > 0) {
        const target = redisKey.split(":").pop() || "unknown";
        const logSql = `
          INSERT INTO audit_logs (admin_id, admin_username, action, details)
          SELECT $1, username, 'BAN_LIFTED', 'Manually lifted security ban for target: ' || $2 
          FROM users 
          WHERE id = $1;
        `;
        await pool.query(logSql, [adminId, target]);
      }

      return deletedCount > 0;
    } catch (error) {
      process.stderr.write(
        `[adminService.liftSecurityBan] RAW ERROR: ${(error as Error).message}\nStack: ${(error as Error).stack}\n`,
      );

      throw error;
    }
  },
};

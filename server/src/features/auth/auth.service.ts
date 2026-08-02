//src/features/auth/auth.service.ts
import { pool } from "../../db/psql.js";

if (!process.env["DB_ENCRYPTION_KEY"]) {
  process.stderr.write(
    "[FATAL ERROR]: DB_ENCRYPTION_KEY is missing from environment variables. Halting startup to prevent data corruption.\n",
  );
  process.exit(1);
}

export const authService = {
  async signup(username: string, hash: string) {
    const sql = `
      INSERT INTO users (username, password_hash) 
      VALUES ($1, $2) 
      RETURNING id, username, role, created_at;
    `;
    return await pool.query(sql, [username, hash]);
  },

  async findUserByUsername(username: string) {
    const sql = `SELECT id, username, password_hash, role, created_at, updated_at FROM users WHERE username = $1;`;
    return await pool.query(sql, [username]);
  },

  async findUserById(id: string) {
    const sql = `
      SELECT 
        id, 
        username, 
        profile_title,
        avatar_url,
        role,
        created_at, 
        updated_at 
      FROM users 
      WHERE id = $1;
    `;
    try {
      return await pool.query(sql, [id]);
    } catch (error) {
      process.stderr.write(
        `[AUTH_SERVICE FATAL ERROR - findUserById]: ${(error as Error).message}\nStack: ${(error as Error).stack}\n`,
      );
      throw error;
    }
  },
  async updateUser(
    username: string | null,
    profileTitle: string | null,
    avatarUrl: string | null,
    id: string,
  ) {
    const sql = `
      UPDATE users 
      SET 
        username = COALESCE($1, username), 
        profile_title = COALESCE($2, profile_title),
        avatar_url = COALESCE($3, avatar_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, username, profile_title, avatar_url, role, updated_at;
    `;
    return await pool.query(sql, [username, profileTitle, avatarUrl, id]);
  },
  async updatePassword(hash: string, id: string) {
    const sql = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `;
    return await pool.query(sql, [hash, id]);
  },

  async deleteUser(id: string) {
    const sql = `DELETE FROM users WHERE id = $1 RETURNING id;`;
    return await pool.query(sql, [id]);
  },

  async createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    userAgent: string | null,
    ipAddress: string | null,
    parentTokenId: string | null = null,
  ) {
    const sql = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address, parent_token_id) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, user_id, parent_token_id, is_revoked, expires_at;
    `;
    return await pool.query(sql, [
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
      parentTokenId,
    ]);
  },

  async findRefreshTokenByHash(tokenHash: string) {
    const sql = `
      SELECT id, user_id, token_hash, parent_token_id, is_revoked, expires_at, user_agent, ip_address, created_at 
      FROM refresh_tokens 
      WHERE token_hash = $1;
    `;
    return await pool.query(sql, [tokenHash]);
  },

  async revokeRefreshTokenById(id: string) {
    const sql = `
      UPDATE refresh_tokens 
      SET is_revoked = true 
      WHERE id = $1 
      RETURNING id;
    `;
    return await pool.query(sql, [id]);
  },

  async revokeRefreshTokenByHash(tokenHash: string) {
    const sql = `
      UPDATE refresh_tokens 
      SET is_revoked = true 
      WHERE token_hash = $1 
      RETURNING id;
    `;
    return await pool.query(sql, [tokenHash]);
  },

  async revokeEntireTokenFamily(userId: string) {
    const sql = `
      UPDATE refresh_tokens 
      SET is_revoked = true 
      WHERE user_id = $1 AND is_revoked = false
      RETURNING id;
    `;
    return await pool.query(sql, [userId]);
  },

  async deleteAllUserRefreshTokens(userId: string) {
    const sql = `
      DELETE FROM refresh_tokens 
      WHERE user_id = $1 
      RETURNING id;
    `;
    return await pool.query(sql, [userId]);
  },

  async deleteExpiredRefreshTokens() {
    const sql = `
      DELETE FROM refresh_tokens 
      WHERE expires_at < CURRENT_TIMESTAMP 
      RETURNING id;
    `;
    return await pool.query(sql);
  },
};

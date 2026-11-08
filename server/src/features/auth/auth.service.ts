//src/features/auth/auth.service.ts
import { pool } from "../../db/psql.js";

export const authService = {
  async findOwnerByUsername(username: string) {
    const sql = `
      SELECT id, username, display_name, profile_title, avatar_url, password_hash, created_at, updated_at
      FROM profile
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1;
    `;
    try {
      return await pool.query(sql, [username]);
    } catch (err) {
      console.error(
        "[auth.service.findOwnerByUsername] Database query failed",
        err,
      );
      throw err;
    }
  },

  async getProfile() {
    const sql = `
      SELECT id, username, display_name, profile_title, avatar_url, password_hash, created_at, updated_at
      FROM profile
      LIMIT 1;
    `;
    try {
      return await pool.query(sql);
    } catch (err) {
      console.error("[auth.service.getProfile] Database query failed", err);
      throw err;
    }
  },

  async createSession(
    tokenHash: string,
    expiresAt: Date,
    userAgent: string | null,
    ipAddress: string | null,
  ) {
    const sql = `
      INSERT INTO sessions (token_hash, expires_at, user_agent, ip_address)
      VALUES ($1, $2, $3, $4)
      RETURNING id, token_hash, expires_at, user_agent, ip_address, created_at;
    `;
    try {
      return await pool.query(sql, [
        tokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      ]);
    } catch (err) {
      console.error("[auth.service.createSession] Database insert failed", err);
      throw err;
    }
  },

  async findSessionByTokenHash(tokenHash: string) {
    const sql = `
      SELECT
        s.id AS session_id,
        s.token_hash,
        s.expires_at,
        p.id AS owner_id,
        p.username,
        p.display_name,
        p.profile_title,
        p.avatar_url
      FROM sessions s
      CROSS JOIN profile p
      WHERE s.token_hash = $1
        AND s.expires_at > CURRENT_TIMESTAMP
      LIMIT 1;
    `;
    try {
      return await pool.query(sql, [tokenHash]);
    } catch (err) {
      console.error(
        "[auth.service.findSessionByTokenHash] Database query failed",
        err,
      );
      throw err;
    }
  },

  async deleteSessionByTokenHash(tokenHash: string) {
    const sql = `
      DELETE FROM sessions
      WHERE token_hash = $1
      RETURNING id;
    `;
    try {
      return await pool.query(sql, [tokenHash]);
    } catch (err) {
      console.error(
        "[auth.service.deleteSessionByTokenHash] Database delete failed",
        err,
      );
      throw err;
    }
  },

  async deleteAllSessions() {
    const sql = `
      DELETE FROM sessions
      RETURNING id;
    `;
    try {
      return await pool.query(sql);
    } catch (err) {
      console.error(
        "[auth.service.deleteAllSessions] Database delete failed",
        err,
      );
      throw err;
    }
  },

  async deleteExpiredSessions() {
    const sql = `
      DELETE FROM sessions
      WHERE expires_at <= CURRENT_TIMESTAMP
      RETURNING id;
    `;
    try {
      return await pool.query(sql);
    } catch (err) {
      console.error(
        "[auth.service.deleteExpiredSessions] Database delete failed",
        err,
      );
      throw err;
    }
  },

  async updateProfile(
    username: string | null,
    displayName: string | null,
    profileTitle: string | null,
    avatarUrl: string | null,
    avatarUrlProvided: boolean,
  ) {
    const sql = `
      UPDATE profile
      SET
        username = COALESCE($1, username),
        display_name = COALESCE($2, display_name),
        profile_title = COALESCE($3, profile_title),
        avatar_url = CASE WHEN $4::boolean THEN $5 ELSE avatar_url END,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, username, display_name, profile_title, avatar_url, created_at, updated_at;
    `;
    try {
      return await pool.query(sql, [
        username,
        displayName,
        profileTitle,
        avatarUrlProvided,
        avatarUrl,
      ]);
    } catch (err) {
      console.error("[auth.service.updateProfile] Database update failed", err);
      throw err;
    }
  },

  async updatePassword(passwordHash: string) {
    const sql = `
      UPDATE profile
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      RETURNING id;
    `;
    try {
      return await pool.query(sql, [passwordHash]);
    } catch (err) {
      console.error(
        "[auth.service.updatePassword] Database update failed",
        err,
      );
      throw err;
    }
  },
};

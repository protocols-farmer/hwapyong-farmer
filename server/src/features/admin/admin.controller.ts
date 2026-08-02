import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "node:stream/consumers";
import jwt from "jsonwebtoken";
import { adminService } from "./admin.service.js";
import type { JWTPayload } from "../auth/auth.types.js";
import type {
  UpdateSystemSettingsDTO,
  UpdateRoleDTO,
  SystemSettingsDTO,
  AdminUserDTO,
  RevokeSessionsDTO,
} from "./admin.types.js";

const ACCESS_TOKEN_SECRET = process.env["ACCESS_TOKEN_SECRET"];

if (!ACCESS_TOKEN_SECRET) {
  process.stderr.write("FATAL ERROR: ACCESS_TOKEN_SECRET is not defined.\n");
  process.exit(1);
}

export const adminController = {
  async listUsers(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        authHeader.split(" ")[1] as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
    } catch (err) {
      process.stderr.write(
        `[listUsers] JWT Verify Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Forbidden: Super Admin only." }));
      return;
    }

    try {
      const results = await adminService.getAllUsers();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ users: results.rows as AdminUserDTO[] }));
    } catch (err) {
      process.stderr.write(
        `[listUsers] DB Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to fetch users" }));
    }
  },

  async changeUserRole(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        authHeader.split(" ")[1] as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
    } catch (err) {
      process.stderr.write(
        `[changeUserRole] JWT Verify Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Forbidden: Super Admin only." }));
      return;
    }

    let body: UpdateRoleDTO;
    try {
      body = (await json(req)) as UpdateRoleDTO;
    } catch (err) {
      process.stderr.write(
        `[changeUserRole] JSON Parse Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON format." }));
      return;
    }

    try {
      const validRoles = ["user", "admin", "super_admin"];

      if (!body.targetUserId || !validRoles.includes(body.newRole)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid input" }));
        return;
      }

      if (decoded.id === body.targetUserId) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Administrative self-mutation protocol is blocked.",
          }),
        );
        return;
      }

      const targetQuery = await adminService.getUserById(body.targetUserId);
      if (targetQuery.rowCount === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Target account not located." }));
        return;
      }

      const targetUser = targetQuery.rows[0];

      if (targetUser.role === "super_admin") {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Clearance Level: Super Admin credentials are immutable once established.",
          }),
        );
        return;
      }

      const result = await adminService.updateUserRole(
        body.targetUserId,
        body.newRole,
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: "Role updated",
          user: result.rows[0] as AdminUserDTO,
        }),
      );
    } catch (err) {
      process.stderr.write(
        `[changeUserRole] DB/Logic Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to update role" }));
    }
  },

  async removeUser(
    req: IncomingMessage,
    res: ServerResponse,
    targetId: string,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        authHeader.split(" ")[1] as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
    } catch (err) {
      process.stderr.write(
        `[removeUser] JWT Verify Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Forbidden: Super Admin only." }));
      return;
    }

    try {
      if (!targetId) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Target User ID required" }));
        return;
      }

      if (decoded.id === targetId) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Self-deletion protocol is rejected by system core.",
          }),
        );
        return;
      }

      const targetQuery = await adminService.getUserById(targetId);
      if (targetQuery.rowCount === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "User not found" }));
        return;
      }

      const targetUser = targetQuery.rows[0];

      if (targetUser.role === "super_admin") {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Purge Rejected: Cannot overwrite concurrent Super Admin node.",
          }),
        );
        return;
      }

      const result = await adminService.deleteUser(targetId, decoded.id);
      if (result.rowCount === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "User not found" }));
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "User account deleted permanently" }));
    } catch (err) {
      process.stderr.write(
        `[removeUser] DB/Logic Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Deletion failed" }));
    }
  },

  async getSettings(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const result = await adminService.getSystemSettings();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ settings: result.rows[0] as SystemSettingsDTO }),
      );
    } catch (err) {
      process.stderr.write(
        `[getSettings] DB Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to fetch system settings" }));
    }
  },

  async updateSettings(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        authHeader.split(" ")[1] as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
    } catch (err) {
      process.stderr.write(
        `[updateSettings] JWT Verify Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Forbidden: Super Admin only." }));
      return;
    }

    let body: UpdateSystemSettingsDTO;
    try {
      body = (await json(req)) as UpdateSystemSettingsDTO;
    } catch (err) {
      process.stderr.write(
        `[updateSettings] JSON Parse Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON format." }));
      return;
    }

    try {
      if (typeof body.is_maintenance !== "boolean") {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "is_maintenance must be a boolean" }));
        return;
      }

      if (
        !body.maintenance_message ||
        body.maintenance_message.length < 10 ||
        body.maintenance_message.length > 500
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "Message must be 10-500 characters." }),
        );
        return;
      }

      const result = await adminService.updateSystemSettings(
        body.is_maintenance,
        body.maintenance_message,
        decoded.id,
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: "System protocols updated successfully.",
          settings: result.rows[0] as SystemSettingsDTO,
        }),
      );
    } catch (err) {
      process.stderr.write(
        `[updateSettings] DB/Logic Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to update maintenance state." }));
    }
  },

  async getLogs(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        authHeader.split(" ")[1] as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
    } catch (err) {
      process.stderr.write(
        `[getLogs] JWT Verify Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Forbidden: Super Admin only." }));
      return;
    }

    try {
      const searchQuery = url.searchParams.get("q") || undefined;
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = 20;

      const results = await adminService.getAuditLogs(searchQuery, page, limit);

      const totalCount =
        results.rows.length > 0 ? parseInt(results.rows[0].full_count, 10) : 0;

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          logs: results.rows,
          total: totalCount,
          page: page,
          totalPages: Math.ceil(totalCount / limit),
        }),
      );
    } catch (err) {
      process.stderr.write(
        `[getLogs] DB Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to fetch audit logs" }));
    }
  },

  async revokeSessions(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        authHeader.split(" ")[1] as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
    } catch (err) {
      process.stderr.write(
        `[revokeSessions] JWT Verify Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Forbidden: Super Admin only." }));
      return;
    }

    let body: RevokeSessionsDTO;
    try {
      body = (await json(req)) as RevokeSessionsDTO;
    } catch (err) {
      process.stderr.write(
        `[revokeSessions] JSON Parse Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON format." }));
      return;
    }

    try {
      if (!body.targetUserId) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Target User ID is required." }));
        return;
      }

      if (decoded.id === body.targetUserId) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Self-termination protocol is blocked. Cannot revoke own sessions.",
          }),
        );
        return;
      }

      const targetQuery = await adminService.getUserById(body.targetUserId);
      if (targetQuery.rowCount === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Target account not located." }));
        return;
      }

      const targetUser = targetQuery.rows[0];

      if (targetUser.role === "super_admin") {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Clearance Level: Super Admin sessions are immutable to external termination.",
          }),
        );
        return;
      }

      const sessionsTerminated = await adminService.revokeAllUserSessions(
        body.targetUserId,
        decoded.id,
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: `Command executed. ${sessionsTerminated} active sessions terminated for target user.`,
        }),
      );
    } catch (err) {
      process.stderr.write(
        `[revokeSessions] DB/Logic Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to revoke sessions." }));
    }
  },

  async getActiveBans(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        authHeader.split(" ")[1] as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
    } catch (err) {
      process.stderr.write(
        `[getActiveBans] JWT Verify Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Forbidden: Super Admin only." }));
      return;
    }

    try {
      const bans = await adminService.getActiveSecurityBans();

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ bans }));
    } catch (err) {
      process.stderr.write(
        `[getActiveBans] Redis/Logic Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ error: "Failed to fetch security bans from Redis." }),
      );
    }
  },

  async liftBan(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(
        authHeader.split(" ")[1] as string,
        ACCESS_TOKEN_SECRET as string,
      ) as JWTPayload;
    } catch (err) {
      process.stderr.write(
        `[liftBan] JWT Verify Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (decoded.role !== "super_admin") {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Forbidden: Super Admin only." }));
      return;
    }

    try {
      const targetKey = url.searchParams.get("key");

      if (!targetKey) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Missing target key parameter." }));
        return;
      }

      const success = await adminService.liftSecurityBan(targetKey, decoded.id);

      if (!success) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "Ban key not found or already expired." }),
        );
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Security ban successfully lifted." }));
    } catch (err) {
      process.stderr.write(
        `[liftBan] DB/Redis Error: ${(err as Error).message}\nStack: ${(err as Error).stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to lift security ban." }));
    }
  },
};

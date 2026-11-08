//src/features/admin/admin.controller.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "node:stream/consumers";
import { adminService } from "./admin.service.js";
import { verifySession } from "../auth/verifySession.js";
import type {
  UpdateSystemSettingsDTO,
  SystemSettingsDTO,
} from "./admin.types.js";

export const adminController = {
  async getSettings(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const result = await adminService.getSystemSettings();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ settings: result.rows[0] as SystemSettingsDTO }),
      );
    } catch (err) {
      console.error(
        "[admin.controller.getSettings] Failed to fetch system settings",
        err,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to fetch system settings." }));
    }
  },

  async updateSettings(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const verifyResult = await verifySession(
      req.headers.authorization,
      "updateSettings",
    );
    if (!verifyResult.ok) {
      res.statusCode = verifyResult.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(verifyResult.body));
      return;
    }

    let body: UpdateSystemSettingsDTO;
    try {
      body = (await json(req)) as UpdateSystemSettingsDTO;
    } catch (err) {
      console.error("[admin.controller.updateSettings] JSON parse failed", err);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON format." }));
      return;
    }

    try {
      if (typeof body.is_maintenance !== "boolean") {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "is_maintenance must be a boolean." }));
        return;
      }

      const trimmedMessage = body.maintenance_message?.trim() || "";
      if (trimmedMessage.length < 10 || trimmedMessage.length > 500) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "Message must be 10-500 characters." }),
        );
        return;
      }

      const result = await adminService.updateSystemSettings(
        body.is_maintenance,
        trimmedMessage,
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
      console.error(
        "[admin.controller.updateSettings] Failed to update maintenance state",
        err,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to update maintenance state." }));
    }
  },
};

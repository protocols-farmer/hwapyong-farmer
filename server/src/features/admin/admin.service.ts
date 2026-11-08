//src/features/admin/admin.service.ts
import { pool } from "../../db/psql.js";
import { maintenanceState } from "../../state/maintenance.js";
import type { SystemSettingsDTO } from "./admin.types.js";

export const adminService = {
  async getSystemSettings() {
    try {
      const sql = `
        SELECT is_maintenance, maintenance_message, updated_at
        FROM system_settings
        WHERE id = 1;
      `;
      return await pool.query(sql);
    } catch (error) {
      console.error(
        "[admin.service.getSystemSettings] Database query failed",
        error,
      );
      throw error;
    }
  },

  async updateSystemSettings(isMaintenance: boolean, message: string) {
    try {
      const settingsSql = `
        UPDATE system_settings
        SET is_maintenance = $1,
            maintenance_message = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING is_maintenance, maintenance_message, updated_at;
      `;
      const result = await pool.query(settingsSql, [isMaintenance, message]);
      const updatedRow = result.rows[0] as SystemSettingsDTO | undefined;

      if (updatedRow) {
        maintenanceState.isMaintenance = updatedRow.is_maintenance;
        maintenanceState.message = updatedRow.maintenance_message;
      }

      return result;
    } catch (error) {
      console.error(
        "[admin.service.updateSystemSettings] Database update failed",
        error,
      );
      throw error;
    }
  },
};

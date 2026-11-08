//src/lib/features/admin/adminSchema.ts
import { z } from "zod";

export const updateMaintenanceSchema = z.object({
  is_maintenance: z.boolean(),
  maintenance_message: z
    .string()
    .min(10, "Message must be at least 10 characters.")
    .max(500, "Message cannot exceed 500 characters."),
});

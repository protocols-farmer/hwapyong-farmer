//src/features/admin/admin.types.ts
import type { UserRole } from "../auth/auth.types.js";

export interface AdminUserDTO {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UpdateRoleDTO {
  targetUserId: string;
  newRole: UserRole;
}

export interface SystemSettingsDTO {
  is_maintenance: boolean;
  maintenance_message: string;
  updated_at: string;
  updated_by?: string | null;
}

export interface UpdateSystemSettingsDTO {
  is_maintenance: boolean;
  maintenance_message: string;
}
export interface AuditLogDTO {
  id: string;
  admin_id: string;
  admin_username: string;
  action: string;
  details: string;
  created_at: string;
}

export interface RevokeSessionsDTO {
  targetUserId: string;
}

export interface SecurityBanDTO {
  key: string;
  type: "IP" | "USERNAME";
  target: string;
  remainingSeconds: number;
}

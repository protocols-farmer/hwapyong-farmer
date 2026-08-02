//src/lib/features/admin/adminTypes.ts
import type { UserRole } from "../auth/authTypes";

export interface AdminUser {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
export interface UpdateRoleRequest {
  targetUserId: string;
  newRole: UserRole;
}

export interface SystemSettings {
  is_maintenance: boolean;
  maintenance_message: string;
  updated_at: string;
}

export interface UpdateMaintenanceRequest {
  is_maintenance: boolean;
  maintenance_message: string;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  admin_username: string;
  action: string;
  details: string;
  created_at: string;
}

export interface SecurityBan {
  key: string;
  type: "IP" | "USERNAME";
  target: string;
  remainingSeconds: number;
}

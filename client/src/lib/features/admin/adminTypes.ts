//src/lib/features/admin/adminTypes.ts

export interface SystemSettings {
  is_maintenance: boolean;
  maintenance_message: string;
  updated_at: string;
}

export interface UpdateMaintenanceRequest {
  is_maintenance: boolean;
  maintenance_message: string;
}

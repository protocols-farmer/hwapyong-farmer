//src/features/admin/admin.types.ts

export interface SystemSettingsDTO {
  is_maintenance: boolean;
  maintenance_message: string;
  updated_at: string;
}

export interface UpdateSystemSettingsDTO {
  is_maintenance: boolean;
  maintenance_message: string;
}

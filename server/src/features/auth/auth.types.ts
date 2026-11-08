//src/features/auth/auth.types.ts

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  profile_title: string;
  avatar_url: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface PublicProfileDTO {
  display_name: string;
  profile_title: string;
  avatar_url: string;
}

export interface OwnerProfileDTO {
  id: string;
  username: string;
  display_name: string;
  profile_title: string;
  avatar_url: string;
}

export interface SessionRow {
  id: string;
  token_hash: string;
  expires_at: Date;
  user_agent: string | null;
  ip_address: string | null;
  created_at: Date;
}

export interface LoginDTO {
  username?: string;
  password?: string;
}

export interface ChangePasswordDTO {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface UpdateProfileDTO {
  username?: string;
  display_name?: string;
  profileTitle?: string;
  profile_title?: string;
  avatarUrl?: string;
  avatar_url?: string;
}

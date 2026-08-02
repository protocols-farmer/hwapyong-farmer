//src/features/auth/auth.types.ts

export type UserRole = "user" | "admin" | "super_admin";

export interface User {
  id: string;
  username: string;
  profile_title: string;
  avatar_url: string;
  role: "super_admin" | "admin" | "user";
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshTokenSession {
  id: string;
  user_id: string;
  token_hash: string;
  parent_token_id: string | null;
  is_revoked: boolean;
  expires_at: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface JWTPayload {
  id: string;
  username: string;
  role: UserRole;
  token_use: "access";
  iat?: number;
  exp?: number;
}

export interface SignupDTO {
  username?: string;
  password?: string;
  confirmPassword?: string;
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

export interface UpdateAccountDTO {
  username?: string;
  profileTitle?: string;
  avatarUrl?: string;
}

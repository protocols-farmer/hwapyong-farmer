//src/lib/features/auth/authTypes.ts

export type UserRole = "user" | "admin" | "super_admin";

export interface User {
  id: string;
  username: string;
  profile_title?: string;
  avatar_url?: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  message?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

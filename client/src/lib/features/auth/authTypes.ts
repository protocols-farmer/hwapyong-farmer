//src/lib/features/auth/authTypes.ts

export interface User {
  id: string;
  username: string;
  display_name: string;
  profile_title: string;
  avatar_url: string;
}

export interface PublicProfile {
  display_name: string;
  profile_title: string;
  avatar_url: string;
}

export interface LoginResponse {
  sessionToken: string;
  expiresAt: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface PublicProfileResponse {
  profile: PublicProfile;
}

export interface UpdateProfileRequest {
  username?: string;
  display_name?: string;
  profile_title?: string;
  avatar_url?: string;
}

export interface UpdateProfileResponse {
  message: string;
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
  sessionToken: string;
  expiresAt: string;
}

export interface AuthState {
  user: User | null;
  sessionToken: string | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

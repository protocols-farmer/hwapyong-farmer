//src/lib/features/auth/authSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, LoginResponse, User } from "./authTypes";

const initialState: AuthState = {
  user: null,
  sessionToken: null,
  expiresAt: null,
  isAuthenticated: false,
  isHydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginResponse>) => {
      const { user, sessionToken, expiresAt } = action.payload;
      state.user = user;
      state.sessionToken = sessionToken;
      state.expiresAt = expiresAt;
      state.isAuthenticated = true;
    },
    setSessionToken: (
      state,
      action: PayloadAction<{ sessionToken: string; expiresAt: string }>,
    ) => {
      state.sessionToken = action.payload.sessionToken;
      state.expiresAt = action.payload.expiresAt;
      state.isAuthenticated = true;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.sessionToken = null;
      state.expiresAt = null;
      state.isAuthenticated = false;
    },
    completeHydration: (state) => {
      state.isHydrated = true;
    },
  },
});

export const {
  setCredentials,
  setSessionToken,
  setUser,
  logout,
  completeHydration,
} = authSlice.actions;

export const selectIsHydrated = (state: { auth: AuthState }) =>
  state.auth.isHydrated;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.isAuthenticated;
export const selectCurrentUser = (state: { auth: AuthState }) =>
  state.auth.user;
export const selectSessionToken = (state: { auth: AuthState }) =>
  state.auth.sessionToken;

export default authSlice.reducer;

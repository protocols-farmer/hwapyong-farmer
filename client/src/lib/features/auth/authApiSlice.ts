//src/lib/features/auth/authApiSlice.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../api/baseQueryWithReauth";
import { AuthResponse } from "./authTypes";

export const authApiSlice = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    banCheck: builder.query<
      { banned: boolean; remainingSeconds: number },
      void
    >({
      query: () => ({
        url: "/auth/ban-check",
        method: "GET",
      }),
    }),

    refreshToken: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: "/auth/refresh",
        method: "POST",
      }),
    }),

    signup: builder.mutation<AuthResponse, any>({
      query: (credentials) => ({
        url: "/auth/signup",
        method: "POST",
        body: credentials,
      }),
    }),

    login: builder.mutation<AuthResponse, any>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),

    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),

    uploadAvatar: builder.mutation<
      { url: string },
      { id?: string; formData: FormData }
    >({
      query: ({ id, formData }) => ({
        url: id ? `/auth/upload-avatar?id=${id}` : "/auth/upload-avatar",
        method: "POST",
        body: formData,
      }),
    }),

    updateAccount: builder.mutation<
      AuthResponse,
      {
        username?: string;
        profileTitle?: string;
        avatarUrl?: string;
        id?: string;
      }
    >({
      query: ({ username, profileTitle, avatarUrl, id }) => ({
        url: id ? `/auth/update?id=${id}` : "/auth/update",
        method: "PATCH",
        body: {
          username,
          profileTitle,
          avatarUrl,
        },
      }),
    }),
    changePassword: builder.mutation<
      { message: string },
      {
        currentPassword?: string;
        newPassword: string;
        confirmPassword: string;
        id?: string;
      }
    >({
      query: ({ id, ...data }) => ({
        url: id ? `/auth/change-password?id=${id}` : "/auth/change-password",
        method: "PATCH",
        body: data,
      }),
    }),

    deleteAccount: builder.mutation<{ message: string }, string | void>({
      query: (id) => ({
        url: id ? `/auth/delete?id=${id}` : "/auth/delete",
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useBanCheckQuery,
  useLazyBanCheckQuery,
  useRefreshTokenMutation,
  useSignupMutation,
  useLoginMutation,
  useLogoutMutation,
  useUploadAvatarMutation,
  useUpdateAccountMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
} = authApiSlice;

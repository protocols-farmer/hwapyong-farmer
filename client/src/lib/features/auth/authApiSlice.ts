//src/lib/features/auth/authApiSlice.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../api/baseQueryWithReauth";
import type {
  LoginResponse,
  MeResponse,
  PublicProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "./authTypes";

export const authApiSlice = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Profile"],
  endpoints: (builder) => ({
    login: builder.mutation<
      LoginResponse,
      { username: string; password: string }
    >({
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

    me: builder.query<MeResponse, void>({
      query: () => ({
        url: "/auth/me",
        method: "GET",
      }),
      providesTags: ["Profile"],
    }),

    getPublicProfile: builder.query<PublicProfileResponse, void>({
      query: () => ({
        url: "/auth/profile",
        method: "GET",
      }),
      providesTags: ["Profile"],
    }),

    uploadAvatar: builder.mutation<{ url: string }, FormData>({
      query: (formData) => ({
        url: "/auth/upload-avatar",
        method: "POST",
        body: formData,
      }),
    }),

    updateProfile: builder.mutation<
      UpdateProfileResponse,
      UpdateProfileRequest
    >({
      query: (body) => ({
        url: "/auth/update",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),

    changePassword: builder.mutation<
      ChangePasswordResponse,
      ChangePasswordRequest
    >({
      query: (body) => ({
        url: "/auth/change-password",
        method: "PATCH",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
  useLazyMeQuery,
  useGetPublicProfileQuery,
  useUploadAvatarMutation,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = authApiSlice;

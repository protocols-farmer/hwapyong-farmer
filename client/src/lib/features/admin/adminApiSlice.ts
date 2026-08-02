//src/lib/features/admin/adminApiSlice.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../api/baseQueryWithReauth";
import type {
  AdminUser,
  SystemSettings,
  UpdateMaintenanceRequest,
  UpdateRoleRequest,
  AuditLog,
  SecurityBan,
} from "./adminTypes";

export const adminApiSlice = createApi({
  reducerPath: "adminApi",
  baseQuery: baseQueryWithReauth,

  tagTypes: ["AdminUser", "Maintenance", "AuditLog", "Bans"],
  endpoints: (builder) => ({
    getUsers: builder.query<{ users: AdminUser[] }, void>({
      query: () => "/admin/users",
      providesTags: ["AdminUser"],
    }),

    updateUserRole: builder.mutation<
      { message: string; user: AdminUser },
      UpdateRoleRequest
    >({
      query: (data) => ({
        url: "/admin/role",
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["AdminUser", "AuditLog"],
    }),

    deleteUser: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/admin/delete/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AdminUser", "AuditLog"],
    }),

    getMaintenance: builder.query<{ settings: SystemSettings }, void>({
      query: () => "/admin/maintenance",
      providesTags: ["Maintenance"],
    }),

    updateMaintenance: builder.mutation<
      { message: string; settings: SystemSettings },
      UpdateMaintenanceRequest
    >({
      query: (data) => ({
        url: "/admin/maintenance",
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Maintenance", "AuditLog"],
    }),

    getAuditLogs: builder.query<
      { logs: AuditLog[]; total: number; page: number; totalPages: number },
      { query?: string; page: number }
    >({
      query: ({ query, page }) => {
        let url = `/admin/logs?page=${page}`;
        if (query) {
          url += `&q=${encodeURIComponent(query)}`;
        }
        return url;
      },
      providesTags: ["AuditLog"],
    }),

    getBans: builder.query<{ bans: SecurityBan[] }, void>({
      query: () => "/admin/bans",
      providesTags: ["Bans"],
    }),

    liftBan: builder.mutation<{ message: string }, string>({
      query: (key) => ({
        url: `/admin/bans?key=${encodeURIComponent(key)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Bans", "AuditLog"],
    }),

    revokeSessions: builder.mutation<{ message: string }, string>({
      query: (targetUserId) => ({
        url: "/admin/revoke-sessions",
        method: "POST",
        body: { targetUserId },
      }),
      invalidatesTags: ["AuditLog"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  useGetMaintenanceQuery,
  useUpdateMaintenanceMutation,
  useGetAuditLogsQuery,
  useGetBansQuery,
  useLiftBanMutation,
  useRevokeSessionsMutation,
} = adminApiSlice;

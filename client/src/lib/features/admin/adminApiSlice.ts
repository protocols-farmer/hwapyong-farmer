//src/lib/features/admin/adminApiSlice.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../api/baseQueryWithReauth";
import type { SystemSettings, UpdateMaintenanceRequest } from "./adminTypes";

export const adminApiSlice = createApi({
  reducerPath: "adminApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Maintenance"],
  endpoints: (builder) => ({
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
      invalidatesTags: ["Maintenance"],
    }),
  }),
});

export const { useGetMaintenanceQuery, useUpdateMaintenanceMutation } =
  adminApiSlice;

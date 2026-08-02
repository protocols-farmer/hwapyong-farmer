//src/lib/features/posts/postsApiSlice.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../api/baseQueryWithReauth";
import { Post, CreatePostDTO, PaginatedPostsResponse } from "./postsTypes";

export const postsApiSlice = createApi({
  reducerPath: "postsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Post"],
  endpoints: (builder) => ({
    getPosts: builder.query<PaginatedPostsResponse, number | void>({
      query: (page = 1) => `/posts/getall?page=${page}`,
      providesTags: ["Post"],
    }),

    getPost: builder.query<{ post: Post }, string>({
      query: (id) => `/posts/getone/${id}`,
      providesTags: (result, error, id) => [{ type: "Post", id }],
    }),

    getFilteredPosts: builder.query<
      PaginatedPostsResponse,
      {
        page?: number;
        q?: string | null;
        category?: string | null;
        subcategory?: string | null;
        tag?: string | null;
        sortBy?: string | null;
        sortOrder?: string | null;
      }
    >({
      query: ({
        page = 1,
        q,
        category,
        subcategory,
        tag,
        sortBy,
        sortOrder,
      }) => {
        const params = new URLSearchParams();
        params.set("page", String(page));

        if (q) params.set("q", q);
        if (category && category !== "all") params.set("category", category);
        if (subcategory) params.set("subcategory", subcategory);
        if (tag) params.set("tag", tag);
        if (sortBy) params.set("sortBy", sortBy);
        if (sortOrder) params.set("sortOrder", sortOrder);

        return `/posts/filter?${params.toString()}`;
      },

      providesTags: ["Post"],
    }),

    uploadMedia: builder.mutation<{ url: string }, FormData>({
      query: (formData) => ({
        url: "/posts/upload",
        method: "POST",
        body: formData,
      }),
    }),

    createPost: builder.mutation<
      { message: string; post: Post },
      CreatePostDTO
    >({
      query: (newPost) => ({
        url: "/posts/create",
        method: "POST",
        body: newPost,
      }),
      invalidatesTags: ["Post"],
    }),

    updatePost: builder.mutation<
      { message: string; post: Post },
      { id: string; data: Partial<CreatePostDTO> }
    >({
      query: ({ id, data }) => ({
        url: `/posts/update/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        "Post",
        { type: "Post", id },
      ],
    }),

    deletePost: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/posts/delete/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Post"],
    }),

    getMyPosts: builder.query<
      PaginatedPostsResponse,
      {
        page?: number;
        q?: string | null;
        category?: string | null;
        subcategory?: string | null;
        tag?: string | null;
        sortBy?: string | null;
        sortOrder?: string | null;
      } | void
    >({
      query: (args) => {
        const params = new URLSearchParams();
        if (args) {
          params.set("page", String(args.page || 1));
          if (args.q) params.set("q", args.q);
          if (args.category && args.category !== "all")
            params.set("category", args.category);
          if (args.subcategory) params.set("subcategory", args.subcategory);
          if (args.tag) params.set("tag", args.tag);
          if (args.sortBy) params.set("sortBy", args.sortBy);
          if (args.sortOrder) params.set("sortOrder", args.sortOrder);
        } else {
          params.set("page", "1");
        }
        return `/posts/mine?${params.toString()}`;
      },
      providesTags: ["Post"],
    }),

    getSuperAdminSeriousProjects: builder.query<PaginatedPostsResponse, number>(
      {
        query: (page = 1) => `/posts/superadmin-serious?page=${page}`,
        providesTags: ["Post"],
      },
    ),

    getSuperAdminDiary: builder.query<PaginatedPostsResponse, number>({
      query: (page = 1) => `/posts/superadmin-diary?page=${page}`,
      providesTags: ["Post"],
    }),

    getAllTags: builder.query<
      { tags: string[] },
      | {
          category?: string | null;
          subcategory?: string | null;
          mine?: boolean;
        }
      | string
      | null
      | void
    >({
      query: (args) => {
        if (typeof args === "object" && args !== null) {
          const hasCat =
            args.category &&
            args.category !== "all" &&
            args.category.trim() !== "";
          const hasSub = args.subcategory && args.subcategory.trim() !== "";
          const isMine = args.mine === true;

          const catStr = hasCat
            ? encodeURIComponent(args.category as string)
            : "";
          const subStr = hasSub
            ? encodeURIComponent(args.subcategory as string)
            : "";

          if (hasCat && hasSub && isMine) {
            return `/posts/tags?category=${catStr}&subcategory=${subStr}&mine=true`;
          } else if (hasCat && hasSub && !isMine) {
            return `/posts/tags?category=${catStr}&subcategory=${subStr}`;
          } else if (hasCat && !hasSub && isMine) {
            return `/posts/tags?category=${catStr}&mine=true`;
          } else if (hasCat && !hasSub && !isMine) {
            return `/posts/tags?category=${catStr}`;
          } else if (!hasCat && !hasSub && isMine) {
            return `/posts/tags?mine=true`;
          } else {
            return `/posts/tags`;
          }
        }

        if (typeof args === "string") {
          if (args !== "all" && args.trim() !== "") {
            return `/posts/tags?category=${encodeURIComponent(args.trim())}`;
          } else {
            return `/posts/tags`;
          }
        }

        return `/posts/tags`;
      },
      providesTags: ["Post"],
    }),
  }),
});

export const {
  useGetPostsQuery,
  useGetPostQuery,
  useGetFilteredPostsQuery,
  useUploadMediaMutation,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useGetMyPostsQuery,
  useGetSuperAdminSeriousProjectsQuery,
  useGetSuperAdminDiaryQuery,
  useGetAllTagsQuery,
} = postsApiSlice;

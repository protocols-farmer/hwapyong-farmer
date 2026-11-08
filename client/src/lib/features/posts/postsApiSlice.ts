//src/lib/features/posts/postsApiSlice.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../../api/baseQueryWithReauth";
import type {
  Post,
  CreatePostDTO,
  UpdatePostDTO,
  PaginatedPostsResponse,
} from "./postsTypes";

export const postsApiSlice = createApi({
  reducerPath: "postsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Post"],
  endpoints: (builder) => ({
    getPost: builder.query<{ post: Post }, string>({
      query: (idOrSlug) => `/posts/getone/${encodeURIComponent(idOrSlug)}`,
      providesTags: (_result, _error, idOrSlug) => [
        "Post",
        { type: "Post", id: idOrSlug },
      ],
    }),

    getFilteredPosts: builder.query<
      PaginatedPostsResponse,
      {
        page?: number;
        q?: string | null;
        category?: string | null;
        subcategory?: string | null;
        tag?: string | null;
        featured?: boolean;
        includeDrafts?: boolean;
        sortBy?: string | null;
        sortOrder?: string | null;
      } | void
    >({
      query: (args) => {
        const params = new URLSearchParams();
        const page = args?.page ?? 1;
        params.set("page", String(page));

        if (args?.q) params.set("q", args.q);
        if (args?.category && args.category !== "all") {
          params.set("category", args.category);
        }
        if (args?.subcategory) params.set("subcategory", args.subcategory);
        if (args?.tag) params.set("tag", args.tag);
        if (args?.featured) params.set("featured", "true");
        if (args?.includeDrafts) params.set("include_drafts", "true");
        if (args?.sortBy) params.set("sortBy", args.sortBy);
        if (args?.sortOrder) params.set("sortOrder", args.sortOrder);

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
      { id: string; data: UpdatePostDTO }
    >({
      query: ({ id, data }) => ({
        url: `/posts/update/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
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

    getAllTags: builder.query<
      { tags: string[] },
      {
        category?: string | null;
        subcategory?: string | null;
        includeDrafts?: boolean;
      } | void
    >({
      query: (args) => {
        const params = new URLSearchParams();
        if (
          args?.category &&
          args.category !== "all" &&
          args.category.trim() !== ""
        ) {
          params.set("category", args.category.trim());
        }
        if (args?.subcategory && args.subcategory.trim() !== "") {
          params.set("subcategory", args.subcategory.trim());
        }
        if (args?.includeDrafts) {
          params.set("include_drafts", "true");
        }
        const queryString = params.toString();
        return queryString ? `/posts/tags?${queryString}` : "/posts/tags";
      },
      providesTags: ["Post"],
    }),
  }),
});

export const {
  useGetPostQuery,
  useGetFilteredPostsQuery,
  useUploadMediaMutation,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useGetAllTagsQuery,
} = postsApiSlice;

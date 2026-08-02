//src/lib/features/posts/postsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PostCategory, PostSubcategory } from "./postsTypes";

interface PostsState {
  searchQuery: string;
  activeCategory: PostCategory | "all";
  activeSubcategory: PostSubcategory | null;
  activeTag: string | null;
  sortBy: "date" | "title";
  sortOrder: "ASC" | "DESC";
  page: number;
}

const initialState: PostsState = {
  searchQuery: "",
  activeCategory: "all",
  activeSubcategory: null,
  activeTag: null,
  sortBy: "date",
  sortOrder: "DESC",
  page: 1,
};

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.activeCategory = "all";
      state.activeSubcategory = null;
      state.activeTag = null;
      state.page = 1;
    },
    setCategory: (
      state,
      action: PayloadAction<{
        cat: PostCategory | "all";
        sub?: PostSubcategory | null;
      }>,
    ) => {
      state.activeCategory = action.payload.cat;
      state.activeSubcategory = action.payload.sub || null;
      state.searchQuery = "";
      state.activeTag = null;
      state.page = 1;
    },
    setTag: (state, action: PayloadAction<string>) => {
      state.activeTag = action.payload;
      state.searchQuery = "";
      state.activeCategory = "all";
      state.activeSubcategory = null;
      state.page = 1;
    },
    setSort: (
      state,
      action: PayloadAction<{ by: "date" | "title"; order: "ASC" | "DESC" }>,
    ) => {
      state.sortBy = action.payload.by;
      state.sortOrder = action.payload.order;
      state.page = 1;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    resetFilters: (state) => {
      state.searchQuery = "";
      state.activeCategory = "all";
      state.activeSubcategory = null;
      state.activeTag = null;
      state.sortBy = "date";
      state.sortOrder = "DESC";
      state.page = 1;
    },
  },
});

export const {
  setSearchQuery,
  setCategory,
  setTag,
  setSort,
  setPage,
  resetFilters,
} = postsSlice.actions;
export default postsSlice.reducer;

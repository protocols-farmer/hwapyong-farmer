//src/lib/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { authApiSlice } from "./features/auth/authApiSlice";
import { postsApiSlice } from "./features/posts/postsApiSlice";
import { adminApiSlice } from "./features/admin/adminApiSlice";

import authReducer from "./features/auth/authSlice";
import postsReducer from "./features/posts/postsSlice";

export const store = configureStore({
  reducer: {
    [authApiSlice.reducerPath]: authApiSlice.reducer,
    [postsApiSlice.reducerPath]: postsApiSlice.reducer,
    [adminApiSlice.reducerPath]: adminApiSlice.reducer,

    auth: authReducer,
    posts: postsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: [
          /^payload.*/,
          /^meta\.arg.*/,
          /^meta\.baseQueryMeta.*/,
        ],
      },
    }).concat(
      authApiSlice.middleware,
      postsApiSlice.middleware,
      adminApiSlice.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

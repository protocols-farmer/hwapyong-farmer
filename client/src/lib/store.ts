//src/lib/store.ts
import {
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from "@reduxjs/toolkit";
import { authApiSlice } from "./features/auth/authApiSlice";
import { postsApiSlice } from "./features/posts/postsApiSlice";
import { adminApiSlice } from "./features/admin/adminApiSlice";

import authReducer, {
  setCredentials,
  setSessionToken,
  logout,
} from "./features/auth/authSlice";

export const SESSION_STORAGE_KEY = "rotten_lab_session";

const authListenerMiddleware = createListenerMiddleware();

authListenerMiddleware.startListening({
  matcher: isAnyOf(setCredentials, setSessionToken),
  effect: (action, listenerApi) => {
    try {
      if (typeof window !== "undefined") {
        const { sessionToken, expiresAt } = (
          action as ReturnType<typeof setSessionToken>
        ).payload;
        window.localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ sessionToken, expiresAt }),
        );
      }
    } catch (err) {
      console.error(
        "[store.authListener] Failed to persist session to localStorage",
        err,
      );
    }

    if (setCredentials.match(action)) {
      listenerApi.dispatch(postsApiSlice.util.resetApiState());
      listenerApi.dispatch(adminApiSlice.util.resetApiState());
      listenerApi.dispatch(authApiSlice.util.resetApiState());
    }
  },
});

authListenerMiddleware.startListening({
  actionCreator: logout,
  effect: (_action, listenerApi) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (err) {
      console.error(
        "[store.authListener] Failed to clear session from localStorage",
        err,
      );
    }

    listenerApi.dispatch(postsApiSlice.util.resetApiState());
    listenerApi.dispatch(adminApiSlice.util.resetApiState());
    listenerApi.dispatch(authApiSlice.util.resetApiState());
  },
});

export const store = configureStore({
  reducer: {
    [authApiSlice.reducerPath]: authApiSlice.reducer,
    [postsApiSlice.reducerPath]: postsApiSlice.reducer,
    [adminApiSlice.reducerPath]: adminApiSlice.reducer,

    auth: authReducer,
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
    })
      .prepend(authListenerMiddleware.middleware)
      .concat(
        authApiSlice.middleware,
        postsApiSlice.middleware,
        adminApiSlice.middleware,
      ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

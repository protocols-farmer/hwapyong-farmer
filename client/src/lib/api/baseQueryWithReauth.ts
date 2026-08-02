//src/lib/api/baseQueryWithReauth.ts
import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { Mutex } from "async-mutex";
import { setCredentials, logout } from "../features/auth/authSlice";
import type { RootState } from "../store";
import type { AuthResponse } from "../features/auth/authTypes";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

if (!baseUrl) {
  console.error("FATAL: NEXT_PUBLIC_API_URL is missing from .env.local");
}

const mutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: baseUrl,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  await mutex.waitForUnlock();

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const url = typeof args === "string" ? args : args.url;

    const isAuthRequest =
      url?.includes("/auth/login") || url?.includes("/auth/signup");

    if (isAuthRequest) {
      return result;
    }

    const isRefreshRequest = url?.includes("/auth/refresh");

    if (isRefreshRequest) {
      api.dispatch(logout());
      return result;
    }

    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        console.warn("Access token expired. Attempting silent refresh...");

        const refreshResult = await rawBaseQuery(
          { url: "/auth/refresh", method: "POST" },
          api,
          extraOptions,
        );

        if (refreshResult.data) {
          console.log("Token rotated successfully. Retrying original request.");

          const authData = refreshResult.data as AuthResponse;
          api.dispatch(setCredentials(authData));

          result = await rawBaseQuery(args, api, extraOptions);
        } else {
          console.warn(
            "Silent refresh failed — logging out and surfacing reason to caller.",
          );
          api.dispatch(logout());
          if (refreshResult.error) {
            result = { error: refreshResult.error };
          }
        }
      } finally {
        release();
      }
    } else {
      await mutex.waitForUnlock();

      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

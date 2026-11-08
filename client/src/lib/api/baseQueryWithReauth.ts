//src/lib/api/baseQueryWithReauth.ts
import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { logout } from "../features/auth/authSlice";
import type { RootState } from "../store";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

if (!baseUrl) {
  console.error("FATAL: NEXT_PUBLIC_API_URL is missing from .env.local");
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: baseUrl,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.sessionToken;
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
  const tokenSent = (api.getState() as RootState).auth.sessionToken;

  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && tokenSent) {
    const errorData = result.error.data as
      { code?: string; error?: string } | undefined;
    const errorCode = errorData?.code;

    if (errorCode === "SESSION_INVALID" || errorCode === "AUTH_MISSING") {
      const currentTokenInState = (api.getState() as RootState).auth
        .sessionToken;
      if (currentTokenInState && currentTokenInState === tokenSent) {
        api.dispatch(logout());
      }
    }
  }

  return result;
};

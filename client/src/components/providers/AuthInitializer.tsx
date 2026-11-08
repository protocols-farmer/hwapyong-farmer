//src/components/providers/AuthInitializer.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLazyMeQuery } from "@/lib/features/auth/authApiSlice";
import {
  setSessionToken,
  setUser,
  logout,
  completeHydration,
  selectSessionToken,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import { SESSION_STORAGE_KEY } from "@/lib/store";

export default function AuthInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch();
  const sessionToken = useSelector(selectSessionToken);
  const currentUser = useSelector(selectCurrentUser);
  const [triggerMe] = useLazyMeQuery();

  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    try {
      const rawStored = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (rawStored) {
        const parsed = JSON.parse(rawStored) as {
          sessionToken?: string;
          expiresAt?: string;
        };

        const token = parsed?.sessionToken;
        const expiresAt = parsed?.expiresAt;
        const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;

        if (
          token &&
          expiresAt &&
          !Number.isNaN(expiresMs) &&
          expiresMs > Date.now()
        ) {
          dispatch(setSessionToken({ sessionToken: token, expiresAt }));
        } else {
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error(
        "[AuthInitializer.hydrate] Failed to read stored session from localStorage",
        err,
      );
      try {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (removeErr) {
        console.error(
          "[AuthInitializer.hydrate] Failed to clear corrupted session",
          removeErr,
        );
      }
    } finally {
      dispatch(completeHydration());
    }
  }, [dispatch]);

  useEffect(() => {
    if (!sessionToken || currentUser) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const syncOwnerProfile = async () => {
      try {
        const res = await triggerMe().unwrap();
        if (!cancelled && res.user) {
          dispatch(setUser(res.user));
        }
      } catch (err: any) {
        console.error(
          "[AuthInitializer.syncOwnerProfile] Background /auth/me check failed",
          err,
        );
        if (!cancelled && err?.status !== 401) {
          retryTimer = setTimeout(syncOwnerProfile, 15000);
        }
      }
    };

    syncOwnerProfile();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [sessionToken, currentUser, triggerMe, dispatch]);

  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== SESSION_STORAGE_KEY) return;

      if (!event.newValue) {
        dispatch(logout());
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as {
          sessionToken?: string;
          expiresAt?: string;
        };
        if (parsed?.sessionToken && parsed?.expiresAt) {
          dispatch(
            setSessionToken({
              sessionToken: parsed.sessionToken,
              expiresAt: parsed.expiresAt,
            }),
          );
        }
      } catch (err) {
        console.error(
          "[AuthInitializer.handleStorageEvent] Failed to parse cross-tab session",
          err,
        );
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, [dispatch]);

  return <>{children}</>;
}

//src/components/layouts/AuthInitializer.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRefreshTokenMutation } from "@/lib/features/auth/authApiSlice";
import {
  setCredentials,
  completeHydration,
  selectIsHydrated,
} from "@/lib/features/auth/authSlice";
import { Settings } from "lucide-react";

export default function AuthInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch();
  const isHydrated = useSelector(selectIsHydrated);
  const [refresh, { isLoading }] = useRefreshTokenMutation();

  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const initializeSession = async () => {
      try {
        const result = await refresh().unwrap();

        dispatch(setCredentials(result));
      } catch (err) {
      } finally {
        dispatch(completeHydration());
      }
    };

    initializeSession();
  }, [dispatch, refresh]);

  if (!isHydrated || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background animate-in fade-in duration-500">
        <div className="mx-auto flex w-full max-w-md flex-col items-center space-y-10 text-center">
          <div className="flex h-24 w-24 items-center justify-center bg-muted border border-border/50">
            <Settings className="h-12 w-12 animate-[spin_10s_linear_infinite] text-foreground/40" />
          </div>

          <div className="space-y-4 w-full">
            <h1 className="text-4xl font-black">Authenticating session</h1>
            <p className="text-muted-foreground font-medium text-sm ">
              The platform is verifying your security credentials and syncing
              your profile data. This usually takes a few moments.
            </p>

            <div className="border bg-muted/20 p-6 text-sm text-left w-full space-y-3">
              <p className="font-bold text-xs text-primary  ">Current status</p>
              <p className="text-muted-foreground ">
                Handshaking with system resources and synchronizing profile
                data...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

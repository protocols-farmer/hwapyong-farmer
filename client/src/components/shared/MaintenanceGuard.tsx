//src/components/shared/MaintenanceGuard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import {
  Hammer,
  ShieldAlert,
  LogIn,
  RefreshCw,
  Loader2,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import { useGetMaintenanceQuery } from "@/lib/features/admin/adminApiSlice";
import { Button } from "@/components/ui/button";
import CornerFlourish from "@/components/shared/CornerFlourish";

export default function MaintenanceGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: currentUser } = useSelector((state: any) => state.auth);

  const { data, error, isFetching, isSuccess, refetch } =
    useGetMaintenanceQuery(undefined, {
      pollingInterval: 8000,
    });

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const renderLoader = () => (
    <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="bg-primary text-primary-foreground font-bold p-1 text-xs">
          INITIALIZING CORE PROTOCOLS...
        </span>
      </div>
    </div>
  );

  if (!isMounted) return renderLoader();

  const errorStatus = (error as any)?.status;
  const isMaintenanceStatus = errorStatus === 503;
  const isRateLimited = errorStatus === 429;

  const backendErrorMessage =
    (error as any)?.data?.error ||
    "Connection to server failed. Please check your network.";

  if (isRateLimited) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 lg:p-6">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="relative border-3 border-double border-destructive p-3 lg:p-6 flex flex-col gap-6 bg-destructive/10">
            <CornerFlourish className="-top-1 -left-1 text-destructive" />
            <CornerFlourish className="-top-1 -right-1 rotate-90 text-destructive" />
            <CornerFlourish className="-bottom-1 -left-1 -rotate-90 text-destructive" />
            <CornerFlourish className="-bottom-1 -right-1 rotate-180 text-destructive" />

            <div className="border-3 border-double border-destructive p-3 bg-background mx-auto">
              <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
            </div>

            <div className="flex flex-col gap-3 text-center">
              <h1 className="bg-destructive text-destructive-foreground font-bold p-1 w-fit mx-auto text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> Rate Limit Exceeded
              </h1>

              <div className="border-l-3 border-double border-destructive pl-3 text-left">
                <p className="text-xs font-bold">{backendErrorMessage}</p>
                <p className="text-xs mt-2 text-destructive font-bold">
                  DDoS protection engaged. Your IP has been temporarily
                  throttled. Please wait 60 seconds before refreshing.
                </p>
              </div>
            </div>

            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              variant="outline"
              className="border-3 border-double border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-none w-full gap-2 transition-all"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              <span className="text-xs font-bold">
                {isFetching
                  ? "Reconnecting..."
                  : "Acknowledge & Retry Connection"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !isMaintenanceStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 lg:p-6">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="relative border-3 border-double border-destructive p-3 lg:p-6 flex flex-col gap-6 bg-destructive/10">
            <CornerFlourish className="-top-1 -left-1 text-destructive" />
            <CornerFlourish className="-top-1 -right-1 rotate-90 text-destructive" />
            <CornerFlourish className="-bottom-1 -left-1 -rotate-90 text-destructive" />
            <CornerFlourish className="-bottom-1 -right-1 rotate-180 text-destructive" />

            <div className="border-3 border-double border-destructive p-3 bg-background mx-auto">
              <WifiOff className="h-8 w-8 text-destructive animate-pulse" />
            </div>

            <div className="flex flex-col gap-3 text-center">
              <h1 className="bg-destructive text-destructive-foreground font-bold p-1 w-fit mx-auto text-sm">
                Connection Severed
              </h1>

              <div className="border-l-3 border-double border-destructive pl-3 text-left">
                <p className="text-xs font-bold">{backendErrorMessage}</p>
              </div>
            </div>

            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              variant="outline"
              className="border-3 border-double border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-none w-full gap-2 transition-all"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              <span className="text-xs font-bold">
                {isFetching ? "Reconnecting..." : "Attempt Reconnection"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isMaintenanceActive =
    (isMaintenanceStatus || data?.settings?.is_maintenance) ?? false;
  const maintenanceMessage =
    data?.settings?.maintenance_message ||
    "The system is currently undergoing critical updates.";

  const isPrivilegedAdmin =
    currentUser?.role === "super_admin" || currentUser?.role === "admin";
  const isWhitelistedRoute =
    pathname === "/auth" || pathname.startsWith("/admin");

  if (isMaintenanceActive && !isPrivilegedAdmin && !isWhitelistedRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 lg:p-6">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="relative border-3 border-double p-3 lg:p-6 flex flex-col gap-6 bg-card/50">
            <CornerFlourish className="-top-1 -left-1" />
            <CornerFlourish className="-top-1 -right-1 rotate-90" />
            <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
            <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

            <div className="border-3 border-double p-3 bg-background mx-auto">
              <Hammer className="h-8 w-8 text-primary animate-pulse" />
            </div>

            <div className="flex flex-col gap-3 text-center">
              <h1 className="bg-primary text-primary-foreground font-bold p-1 w-fit mx-auto text-sm flex items-center gap-2">
                System Lockdown
              </h1>

              <div className="border-l-3 border-double pl-3 text-left">
                <p className="text-xs font-bold">{maintenanceMessage}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <Button
                onClick={() => refetch()}
                disabled={isFetching}
                variant="outline"
                className="border-3 border-double rounded-none w-full gap-2 transition-all hover:bg-primary hover:text-primary-foreground"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                <span className="text-xs font-bold">
                  {isFetching ? "Checking..." : "Refresh Protocols"}
                </span>
              </Button>
              <Button
                onClick={() => router.push("/auth")}
                className="border-3 border-double rounded-none w-full gap-2 transition-all"
              >
                <LogIn className="h-4 w-4" />
                <span className="text-xs font-bold">Terminal Login</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

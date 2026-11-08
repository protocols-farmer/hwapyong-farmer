//src/components/shared/AuthGuard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Lock, ShieldAlert, LogIn, Loader2 } from "lucide-react";
import { RootState } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { CornerFlourish } from "./flourishes/CornerFlourish";
import { selectIsHydrated } from "@/lib/features/auth/authSlice";

interface AuthGuardProps {
  children: React.ReactNode;
  message?: string;
  level?: "info" | "warning" | "critical";
}

export default function AuthGuard({
  children,
  message = "Please log in with owner credentials to view.",
  level = "info",
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const isHydrated = useSelector(selectIsHydrated);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  if (!isHydrated) {
    return (
      <div className="relative border-3 border-double p-6 flex flex-col items-center justify-center gap-4 bg-card/50">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative border-3 border-double p-6 flex flex-col items-center justify-center gap-4 bg-card/50">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <div className="border-3 border-double p-3 bg-background">
          {level === "critical" ? (
            <ShieldAlert className="h-8 w-8 text-destructive" />
          ) : (
            <Lock className="h-8 w-8 text-primary" />
          )}
        </div>

        <div className="text-center flex flex-col gap-2">
          <h3 className="font-bold text-sm bg-primary text-primary-foreground px-2 py-1 w-fit mx-auto">
            Access Restricted :
          </h3>
          <p className="text-xs font-bold max-w-[250px] leading-relaxed">
            {message}
          </p>
        </div>

        <Button
          onClick={() => router.push("/auth")}
          variant="outline"
          className="border-3 border-double rounded-none h-10 gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
        >
          <LogIn className="h-4 w-4" />
          <span className="text-xs font-bold">Login</span>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

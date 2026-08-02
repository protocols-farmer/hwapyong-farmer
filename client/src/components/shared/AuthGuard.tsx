//src/components/shared/AuthGuard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Lock, ShieldAlert, LogIn, Home } from "lucide-react";
import { RootState } from "@/lib/store";
import { Button } from "@/components/ui/button";
import CornerFlourish from "./CornerFlourish";

interface AuthGuardProps {
  children: React.ReactNode;
  message?: string;
  level?: "info" | "warning" | "critical";
  allowedRoles?: Array<"user" | "admin" | "super_admin">;
}

export default function AuthGuard({
  children,
  message = "Please log in with credentials to view.",
  level = "info",
  allowedRoles,
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

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
            Access Restricted
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

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="relative border-3 border-double border-destructive p-6 flex flex-col items-center justify-center gap-4 bg-destructive/10">
        <CornerFlourish className="-top-1 -left-1 text-destructive" />
        <CornerFlourish className="-top-1 -right-1 rotate-90 text-destructive" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90 text-destructive" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180 text-destructive" />

        <div className="border-3 border-double border-destructive p-3 bg-background">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>

        <div className="text-center flex flex-col gap-2">
          <h3 className="font-bold text-sm bg-destructive text-destructive-foreground px-2 py-1 w-fit mx-auto">
            Clearance Rejected
          </h3>
          <p className="text-xs font-bold max-w-[280px] leading-relaxed text-foreground">
            Your current credential level ({user.role}) does not have
            authorization to view this terminal.
          </p>
        </div>

        <Button
          onClick={() => router.push("/")}
          variant="outline"
          className="border-3 border-double border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-none h-10 gap-2 transition-all"
        >
          <Home className="h-4 w-4" />
          <span className="text-xs font-bold">Return to Base</span>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

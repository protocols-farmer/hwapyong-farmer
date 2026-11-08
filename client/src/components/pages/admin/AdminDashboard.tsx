//src/components/pages/admin/AdminDashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CornerFlourish } from "@/components/shared/flourishes/CornerFlourish";
import AuthGuard from "@/components/shared/AuthGuard";
import { selectIsHydrated } from "@/lib/features/auth/authSlice";
import MaintenanceProtocol from "./components/MaintenanceProtocol";

type ToastType = {
  message: string;
  type: "success" | "error";
} | null;

export default function AdminDashboard() {
  const isHydrated = useSelector(selectIsHydrated);
  const [toast, setToast] = useState<ToastType>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (!isMounted || !isHydrated) {
    return (
      <section className="p-3 lg:p-6 min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </section>
    );
  }

  return (
    <AuthGuard
      message="Owner credentials required to access system maintenance controls."
      level="critical"
    >
      <section className="p-3 lg:p-6 min-h-screen flex flex-col gap-6 bg-background text-foreground">
        <header className="relative border-3 border-double p-3 flex flex-col gap-3">
          <CornerFlourish className="-top-1 -left-1" />
          <CornerFlourish className="-top-1 -right-1 rotate-90" />
          <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
          <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

          <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
            System Administration :
          </h4>
          <p className="border-l-3 border-double pl-3 font-bold text-xs">
            Control the public maintenance gate and broadcast status messages.
          </p>
        </header>

        {toast && (
          <div
            className={cn(
              "border-3 border-double p-3 flex items-center gap-2 sticky top-4 z-50 shadow-md",
              toast.type === "success"
                ? "border-primary bg-primary/90 text-primary-foreground"
                : "border-destructive bg-destructive/90 text-destructive-foreground",
            )}
          >
            <p className="text-xs font-bold">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-auto text-xs font-bold hover:opacity-70 transition-colors"
            >
              dismiss
            </button>
          </div>
        )}

        <MaintenanceProtocol showToast={showToast} />
      </section>
    </AuthGuard>
  );
}

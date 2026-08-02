//src/components/pages/admin/AdminDashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import CornerFlourish from "@/components/shared/CornerFlourish";
import { Button } from "@/components/ui/button";
import AuthGuard from "@/components/shared/AuthGuard";

import MaintenanceProtocol from "./components/MaintenanceProtocol";
import SecurityBans from "./components/SecurityBans";
import UserDirectory from "./components/UserDirectory";
import SystemLogs from "./components/SystemLogs";

type ToastType = {
  message: string;
  type: "success" | "error";
} | null;

export default function AdminDashboard() {
  const router = useRouter();
  const { user: currentUser } = useSelector((state: any) => state.auth);
  const [toast, setToast] = useState<ToastType>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (!isMounted) {
    return (
      <section className="p-3 lg:p-6 min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </section>
    );
  }

  return (
    <AuthGuard
      message="Super Admin credentials required for entry."
      level="critical"
    >
      {!currentUser || currentUser.role !== "super_admin" ? (
        <section className="p-3 lg:p-6 min-h-screen flex items-center justify-center bg-background">
          <div className="border-3 border-double border-destructive p-6 max-w-md w-full text-center flex flex-col gap-4 bg-destructive/10">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold text-destructive">
              Access Denied
            </h1>
            <p className="text-sm font-bold">
              You have reached a restricted administrative terminal. Your
              current credentials do not have Super Admin clearance.
            </p>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="border-3 border-double rounded-none"
            >
              Return Home
            </Button>
          </div>
        </section>
      ) : (
        <section className="p-3 lg:p-6 min-h-screen flex flex-col gap-6 bg-background text-foreground">
          <header className="relative border-3 border-double p-3 flex flex-col gap-3">
            <CornerFlourish className="-top-1 -left-1" />
            <CornerFlourish className="-top-1 -right-1 rotate-90" />
            <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
            <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

            <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
              System Administration
            </h4>
            <p className="border-l-3 border-double pl-3  font-bold">
              Global user directory, network security, and access matrix.
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
          <SecurityBans showToast={showToast} />
          <UserDirectory currentUserId={currentUser.id} showToast={showToast} />
          <SystemLogs />
        </section>
      )}
    </AuthGuard>
  );
}

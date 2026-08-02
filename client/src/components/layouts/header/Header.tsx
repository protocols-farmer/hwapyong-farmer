//src/components/pages/header/Header.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ThemeToggler } from "./ThemeToggler";
import MobileSidebar from "../sidebar/MobileSidebar";
import Logo from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

export default function Header() {
  const [mounted, setMounted] = useState(false);

  // Grab the secured auth state from Redux RAM
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b-3 border-double backdrop-blur-lg z-50 flex justify-between p-3 gap-3 items-center">
      <div className="flex items-center gap-3">
        <MobileSidebar />
        <Logo />

        {mounted && isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Welcome, {user.username}</span>
            <span
              className={cn(
                "text-[9px] font-black tracking-widest  px-1.5 py-0.5 border-3 border-double selection:bg-transparent",
                user.role === "super_admin" &&
                  "bg-primary text-primary-foreground border-primary",
                user.role === "admin" &&
                  "bg-card text-foreground border-foreground",
                user.role === "user" &&
                  "opacity-60 bg-background border-foreground/30",
              )}
            >
              {user.role === "super_admin" ? "super admin" : user.role}
            </span>
          </div>
        ) : (
          <p>
            Welcome{" "}
            <span className="text-sm font-bold text-primary">Visitor</span>{" "}
          </p>
        )}
      </div>

      <div>
        <Button
          variant="outline"
          className="rounded-none border-double border-3"
          asChild
        >
          {mounted && isAuthenticated ? (
            <Link href="/me" className="w-full">
              account
            </Link>
          ) : (
            <Link href="/auth" className="w-full">
              auth
            </Link>
          )}
        </Button>
      </div>
      <div>
        {mounted && isAuthenticated && (
          <Button
            variant="outline"
            className="rounded-none border-double border-3"
            asChild
          >
            <Link href="/posts/create-post" className="w-full">
              create
            </Link>
          </Button>
        )}
      </div>
      <ThemeToggler />
    </header>
  );
}

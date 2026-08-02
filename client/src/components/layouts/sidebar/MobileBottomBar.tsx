//src/components/layouts/sidebar/MobileBottomBar.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plus, Home, Files, FlaskConical } from "lucide-react";

const bottomNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/posts/all-posts", label: "All Posts", icon: Files },
  { href: "/posts/projects", label: "Projects", icon: FlaskConical },
  { href: "/posts/create", label: "Create", icon: Plus, isCentral: true },
];

export default function MobileBottomBar() {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "lg:hidden fixed bottom-0 left-0 z-50 w-full bg-background/95 backdrop-blur-lg",
        "border-t-3 border-double",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className="grid h-16 grid-cols-4 items-center">
        {bottomNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          if (item.isCentral) {
            return (
              <div
                key={item.label}
                className="flex justify-center items-center"
              >
                <Link
                  href={item.href}
                  className={cn(
                    "relative -top-5 flex h-14 w-14 items-center justify-center rounded-none",
                    "border-3 border-double bg-primary text-primary-foreground active:scale-90 transition-transform",
                  )}
                >
                  <item.icon className="h-7 w-7" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group inline-flex flex-col items-center justify-center relative active:scale-95 transition-all",
                "h-full gap-1",
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-bold transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>

              <span
                className={cn(
                  "absolute -bottom-1 h-1 w-1 bg-primary transition-all duration-300",
                  isActive ? "opacity-100 scale-100" : "opacity-0 scale-0",
                )}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

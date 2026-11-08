//src/components/layouts/sidebar/sideBarCards/QuickNavigationCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "@/lib/features/auth/authSlice";
import { cn } from "@/lib/utils";
import { navLinks } from "../../../shared/navLinks";

export default function QuickNavigationCard() {
  const pathname = usePathname();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleLinks = navLinks.filter(
    (link) => !link.ownerOnly || (mounted && isAuthenticated),
  );

  return (
    <div className="border-3 border-double transition-all duration-300 p-3 flex flex-col gap-3">
      <div className="flex gap-1 items-center text-primary">
        <h3>Quick Navigation</h3>
      </div>

      <nav className="flex flex-col gap-3">
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group relative border-3 border-double transition-all duration-300 p-3 flex gap-1 text-xs items-center hover:bg-card hover:text-primary",
                isActive && "bg-card text-primary",
              )}
            >
              <div
                className={cn(
                  "absolute -left-[3px] top-1/2 -translate-y-1/2 w-1 bg-primary transition-all duration-300",
                  isActive ? "h-5" : "h-0 group-hover:h-3",
                )}
              />

              <link.icon className="h-3 w-3" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

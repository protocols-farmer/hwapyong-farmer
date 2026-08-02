// src/components/layouts/footer/Footer.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Logo from "@/components/shared/Logo";
import CornerFlourish from "@/components/shared/CornerFlourish";
import { navLinks } from "../../shared/navLinks";

export default function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t-3 border-double p-3 lg:p-6 bg-background flex flex-col gap-6 mb-[100px]">
      <div className="grid gap-6 md:grid-cols-4">
        {/* BRANDING */}
        <div className="relative border-3 border-double p-3 flex flex-col gap-3">
          <CornerFlourish className="-top-1 -left-1" />
          <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

          <Logo />

          <p className="text-sm">
            Building beautiful dashboards for the modern web. We make the
            complex simple and the simple beautiful.
          </p>
        </div>

        {/* QUICK NAVIGATION (Reusing navLinks) */}
        <div className="relative border-3 border-double p-3 flex flex-col gap-3 md:col-span-2">
          <div className="text-primary">
            <h3 className="font-bold">Quick Links</h3>
          </div>

          <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "border-3 border-double transition-all duration-300 p-3 flex gap-1 text-sm items-center hover:bg-card hover:text-primary",
                    isActive && "bg-card text-primary",
                  )}
                >
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* NEWSLETTER */}
        <div className="relative border-3 border-double p-3 flex flex-col gap-3">
          <div className="text-primary">
            <h3 className="font-bold">Stay Connected</h3>
          </div>

          <p className="text-sm">
            Subscribe to our newsletter to get the latest updates and news.
          </p>

          <div className="p-3 border-3 border-double bg-card/30">
            <p className="text-sm font-bold text-primary">
              This feature is not available yet.
            </p>
          </div>
        </div>
      </div>

      {/* COPYRIGHT AREA */}
      <div className="relative border-3 border-double p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <p className="text-sm font-bold text-primary">
          &copy; {currentYear} Rotten Lab. All rights reserved.
        </p>

        <div className="flex gap-4">
          <Link
            href="privacy"
            className="text-sm hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="terms"
            className="text-sm hover:text-primary transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}

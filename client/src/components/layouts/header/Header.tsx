//src/components/layouts/header/Header.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ThemeToggler } from "./ThemeToggler";
import MobileSidebar from "../sidebar/MobileSidebar";
import Logo from "@/components/shared/Logo";
import { cn } from "@/lib/utils";
import { OrnateVictoria } from "@/components/shared/flourishes/OrnateVictoria";
import { BorderCenterpiece } from "@/components/shared/flourishes/BorderCenterpiece";

const FRAME_SIZES = "(max-width: 800px) 72px, (max-width: 1780px) 9vw, 160px";

function Nail() {
  return (
    <span
      aria-hidden
      className="absolute -top-1.5 left-1/2 z-10 h-3 w-3 -translate-x-1/2 rounded-full bg-foreground shadow-md"
    />
  );
}

function AgedPhoto({
  src,
  alt,
  sizes,
}: {
  src: string;
  alt: string;
  sizes: string;
}) {
  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover sepia-[.35] contrast-125 saturate-125 brightness-95"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[url('/old-paper.png')] bg-cover bg-center opacity-25 mix-blend-multiply"
      />
    </>
  );
}

type FrameProps = {
  src: string;
  alt: string;
  className?: string;
};

function VictorianFrame({ src, alt, className }: FrameProps) {
  return (
    <div
      className={cn(
        "relative aspect-square w-[clamp(4.5rem,9vw,10rem)]",
        className,
      )}
    >
      <Nail />
      <div className="absolute inset-[15%] overflow-hidden">
        <AgedPhoto src={src} alt={alt} sizes={FRAME_SIZES} />
      </div>
      <Image
        src="/transparent-frame.png"
        alt=""
        aria-hidden
        fill
        sizes={FRAME_SIZES}
        className="pointer-events-none select-none object-contain"
      />
    </div>
  );
}

function PlainFrame({ src, alt, className }: FrameProps) {
  return (
    <div className={cn("relative w-[clamp(4.5rem,9vw,10rem)]", className)}>
      <Nail />
      <div className="border-3 border-double border-foreground bg-card p-2 shadow-md">
        <div className="relative aspect-square overflow-hidden border border-border">
          <AgedPhoto src={src} alt={alt} sizes={FRAME_SIZES} />
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const [mounted, setMounted] = useState(false);

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Photo band — plain flow, scrolls away normally. */}
      <header className="header-container relative overflow-x-clip border-b-3 border-double px-[clamp(1rem,4vw,2.5rem)] py-[clamp(2rem,5vw,3.5rem)]">
        <OrnateVictoria className="-top-1 -left-1" />
        <OrnateVictoria className="-top-1 -right-1 rotate-90" />
        <OrnateVictoria className="-bottom-1 -left-1 -rotate-90" />
        <OrnateVictoria className="-bottom-1 -right-1 rotate-180" />

        <BorderCenterpiece className="absolute top-0 left-1/2 z-20 h-auto w-[clamp(6rem,12vw,11rem)] -translate-x-1/2 -translate-y-[60%]" />
        <BorderCenterpiece className="absolute bottom-0 left-1/2 z-20 h-auto w-[clamp(6rem,12vw,11rem)] translate-y-[60%] rotate-180 -translate-x-1/2" />

        <div className="flex flex-col items-center gap-[clamp(1rem,4vw,2rem)] sm:flex-row sm:items-end sm:justify-center">
          <div className="flex items-end justify-center gap-[clamp(0.5rem,2vw,1.5rem)]">
            <VictorianFrame
              src="/patent.jpeg"
              alt="Patent illustration"
              className="-rotate-6 translate-y-1"
            />
            <PlainFrame
              src="/kid-me.jpg"
              alt="Childhood photo"
              className="rotate-3 translate-y-3"
            />
          </div>

          <h1 className="px-3 text-center font-ghosthey text-[clamp(1.875rem,6vw,4.5rem)] text-foreground">
            Rotten Lab
          </h1>

          <div className="flex items-end justify-center gap-[clamp(0.5rem,2vw,1.5rem)]">
            <PlainFrame
              src="/me.jpeg"
              alt="Portrait photo"
              className="-rotate-3 translate-y-3"
            />
            <VictorianFrame
              src="/my-love.jpeg"
              alt="Portrait"
              className="rotate-6 translate-y-1"
            />
          </div>
        </div>
      </header>

      {/* Nav — now a sibling of <main> in AppLayout, not nested inside
          <header>. That's what gives it a containing block tall enough
          to actually stay pinned while the page scrolls. */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b-3 border-double bg-card/85 p-3 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <MobileSidebar />
          <Logo />

          {mounted && isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">
                Welcome, {user.username}
              </span>
              <span
                className={cn(
                  "text-[9px] font-black   px-1.5 py-0.5 border-3 border-double selection:bg-transparent",
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
              <span className="text-sm font-bold text-primary">
                Visitor
              </span>{" "}
            </p>
          )}
        </div>

        <nav>
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
        </nav>

        <div>
          {mounted &&
            isAuthenticated &&
            (user?.role === "admin" || user?.role === "super_admin") && (
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
      </div>
    </>
  );
}

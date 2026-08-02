//src/components/layouts/sidebar/sideBarCards/HomeCard.tsx
"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HomeCard() {
  const pathname = usePathname();
  const isActive = pathname === "/";

  return (
    <Link
      href="/"
      className={cn(
        " border-3 hover:bg-card/50 border-double transition-all duration-300 p-3 flex flex-col gap-3 ",
        isActive && "bg-card  ",
      )}
    >
      <div className="flex gap-1 items-center text-primary ">
        <h3>Home & About</h3>
      </div>

      <div className="p-3 border-3 border-double text-xs flex flex-col gap-1">
        <span className="underline text-primary">Notice </span>
        <p>In this home section you will find every thing about myself.</p>
      </div>

      <Button
        asChild
        variant="outline"
        className="border-3 border-double rounded-none w-full pointer-events-none"
      >
        <span>Enter Room</span>
      </Button>
    </Link>
  );
}

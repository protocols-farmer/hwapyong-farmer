//src/components/layouts/sidebar/Sidebar.tsx
"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  LayoutGrid,
  Monitor,
  Dna,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { navLinks } from "../../shared/navLinks";
import HomeCard from "./sideBarCards/HomeCard";
import CategoryCard from "./sideBarCards/CategoryCard";
import QuickNavigationCard from "./sideBarCards/QuickNavigationCard";
import CornerFlourish from "@/components/shared/CornerFlourish";
import Link from "next/link";

const categories = [
  { icon: Monitor, href: "/posts/computer-science", label: "Computer Science" },
  { icon: Dna, href: "/posts/bio-engineering", label: "Bio-engineering" },
  { icon: FlaskConical, href: "/posts/projects", label: "Projects" },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const CollapsedLink = ({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: any;
    label: string;
  }) => {
    const isActive = pathname === href;
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className={cn(
                " rounded-none relative transition-all text-primary border-3 border-double",
                isActive && "bg-primary text-primary-foreground",
              )}
            >
              <Link href={href}>
                <Icon className="h-5 w-5" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="rounded-none border-3 border-double font-bold  text-xs"
          >
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <aside
      className={cn(
        " sticky top-0 hidden lg:flex flex-col border-3 border-double h-screen transition-all duration-500 ease-in-out p-3 lg:p-5",
        isCollapsed ? "w-30" : "w-50  xl:w-70",
      )}
    >
      <Button
        variant="outline"
        size="icon"
        className="rounded-none absolute -right-4 top-1/2  h-7 w-7 z-50 bg-background border-3 border-double  "
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <CornerFlourish className="-top-1 -left-1 rotate-0" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        {isCollapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </Button>

      <div className="relative flex flex-1 flex-col min-h-0">
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-6 bg-linear-to-b from-black/10 dark:from-black/40 to-transparent" />

        <div
          // className={cn(
          //   "flex-1 space-y-5 transition-colors duration-300",
          //   "overflow-y-hidden hover:overflow-y-auto",
          //   "[&::-webkit-scrollbar]:w-1.5",
          //   "[&::-webkit-scrollbar-track]:bg-border/20",
          //   "[&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-primary",
          // )}

          className={cn(
            "flex-1 space-y-5 transition-colors duration-300",
            "overflow-y-auto",
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-border/20",
            "[&::-webkit-scrollbar-thumb]:bg-primary",
          )}
        >
          {!isCollapsed ? (
            <>
              <HomeCard />
              <CategoryCard />
              <QuickNavigationCard />
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 ">
              <CollapsedLink href="/" icon={Home} label="Entrance" />

              {categories.map((cat) => (
                <CollapsedLink
                  key={cat.href}
                  href={cat.href}
                  icon={cat.icon}
                  label={cat.label}
                />
              ))}

              {navLinks.map((link) => (
                <CollapsedLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  label={link.label}
                />
              ))}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 bg-linear-to-t from-black/10 dark:from-black/40 to-transparent" />
      </div>

      {!isCollapsed ? (
        <div className="relative p-3 border-3  border-double flex flex-col gap-1">
          <CornerFlourish className="-top-1 -left-1 rotate-0" />
          <CornerFlourish className="-top-1 -right-1 rotate-90" />
          <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
          <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

          <p className="text-xs">
            Well who would refuse a free coffee from you guys hehe any amount
            will do bro{" "}
          </p>
          <Button className="w-full rounded-none border-3 border-double">
            Donate
          </Button>
        </div>
      ) : (
        <div className="p-3 border-t-3 border-double flex flex-col items-center ">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary  rounded-none border-3 border-double"
                >
                  <Heart className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="w-full rounded-none border-3 border-double font-black"
              >
                Donate / Support
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </aside>
  );
}

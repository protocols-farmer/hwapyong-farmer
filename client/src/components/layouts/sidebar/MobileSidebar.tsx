//src/components/layouts/sidebar/MobileSidebar.tsx
"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTrigger,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Heart, User } from "lucide-react";
import Link from "next/link";

import HomeCard from "./sideBarCards/HomeCard";
import CategoryCard from "./sideBarCards/CategoryCard";
import QuickNavigationCard from "./sideBarCards/QuickNavigationCard";
import CornerFlourish from "@/components/shared/CornerFlourish";
import Logo from "@/components/shared/Logo";

export default function MobileSidebar() {
  return (
    <div className="lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-none border-3 border-double"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="flex flex-col bg-background p-0 border-r-3 border-double w-80"
        >
          <SheetHeader className="h-16 shrink-0 border-b-3 border-double px-3 flex flex-row items-center gap-3">
            <SheetTitle className="flex items-center gap-3">
              <Logo />
            </SheetTitle>
            <SheetDescription className="sr-only">
              Mobile navigation menu
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <SheetClose asChild>
              <div>
                <HomeCard />
              </div>
            </SheetClose>

            <SheetClose asChild>
              <div>
                <CategoryCard />
              </div>
            </SheetClose>

            <SheetClose asChild>
              <div>
                <QuickNavigationCard />
              </div>
            </SheetClose>
          </div>

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

          <SheetFooter className="border-t-3 border-double p-3 shrink-0">
            <div className="flex w-full items-center justify-between border-3 border-double p-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 border-3 border-double flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <Link
                  href="/me"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Manage Account
                </Link>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

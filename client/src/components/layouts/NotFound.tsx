//src/components/layouts/NotFound.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import CornerFlourish from "@/components/shared/CornerFlourish";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <section className="min-h-screen flex items-center justify-center p-3">
      <div className="relative border-3 border-double p-3 md:p-5 lg:p-7 flex flex-col gap-6 max-w-lg w-full">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <span className="flex flex-col items-center gap-3 text-3xl md:text-5xl lg:text-7xl text-primary font-bold">
          404
        </span>

        <div className="flex flex-col gap-3 text-center">
          <h1 className="bg-primary text-primary-foreground font-bold p-1 w-fit mx-auto">
            Room Not Found
          </h1>

          <div className="border-l-3 border-double pl-3 text-left">
            <p className="text-sm font-bold">
              This room doesn't exist. Maybe it was deleted, maybe it was never
              built, or maybe you typed the wrong key.
            </p>
          </div>
        </div>

        <div className="relative border-3 border-double p-3 flex flex-col gap-3">
          <CornerFlourish className="-top-1 -left-1" />
          <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

          <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-xs">
            What could have happened?
          </h4>

          <div className="border-l-3 border-double pl-3 flex flex-col gap-2">
            <p className="text-xs">
              <span className="text-primary font-bold">Wrong URL —</span> Check
              if you typed it correctly. No shame, I do it too.
            </p>
            <p className="text-xs">
              <span className="text-primary font-bold">Dead Link —</span>{" "}
              Someone might have linked to a post that got deleted.
            </p>
            <p className="text-xs">
              <span className="text-primary font-bold">
                I Broke Something —
              </span>{" "}
              If this is my fault, I'll fix it when I notice.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            asChild
            variant="outline"
            className="border-3 border-double rounded-none flex-1 gap-1"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="border-3 border-double rounded-none flex-1 gap-1"
          >
            <Link href="/computer">
              <Search className="h-4 w-4" />
              <span>Browse Posts</span>
            </Link>
          </Button>
        </div>

        <p className="text-xs text-center">
          If you think something should be here,{" "}
          <Link href="/contact" className="underline text-primary font-bold">
            let me know
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

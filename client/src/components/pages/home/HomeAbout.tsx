//src/components/pages/home/HomeAbout.tsx
"use client";
import { BorderCenterpiece } from "@/components/shared/flourishes/BorderCenterpiece";
import { OrnateVictoria } from "@/components/shared/flourishes/OrnateVictoria";
import { Button } from "@/components/ui/button";
import Link from "next/dist/client/link";

function HomeAbout() {
  return (
    <div className="relative border-3 border-double  p-3 flex flex-col gap-3">
      <OrnateVictoria className="-top-1 -left-1" />
      <OrnateVictoria className="-top-1 -right-1 rotate-90" />
      <OrnateVictoria className="-bottom-1 -left-1 -rotate-90" />
      <OrnateVictoria className="-bottom-1 -right-1 rotate-180" />

      <BorderCenterpiece className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[60%] w-44 h-auto z-20" />
      <BorderCenterpiece className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[60%] w-44 h-auto rotate-180 z-20" />

      <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
        About me :
      </h4>

      <p className=" border-l-3 border-double pl-3">
        I just like doing teachign my self stuff and doing some random research.
        And also creating things bruhhhhhh the beauty fo autism. You can check
        more about me by clicking bellow button.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="rounded-none border-3 border-double w-fit"
      >
        <Link
          href="/about"
          className="w-full h-full flex items-center justify-center"
        >
          Read more
        </Link>
      </Button>
    </div>
  );
}
export default HomeAbout;

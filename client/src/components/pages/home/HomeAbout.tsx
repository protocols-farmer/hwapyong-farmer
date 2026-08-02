//src/components/pages/home/HomeAbout.tsx
"use client";
import CornerFlourish from "@/components/shared/CornerFlourish";
import { Button } from "@/components/ui/button";
import Link from "next/dist/client/link";

function HomeAbout() {
  return (
    <div className="relative border-3 border-double  p-3 flex flex-col gap-3">
      <CornerFlourish className="-top-1 -left-1" />
      <CornerFlourish className="-top-1 -right-1 rotate-90" />
      <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
      <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

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

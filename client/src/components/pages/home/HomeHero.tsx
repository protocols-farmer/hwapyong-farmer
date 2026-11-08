//src/components/pages/home/Home.tsx
"use client";

import Image from "next/image";
import { BorderCenterpiece } from "@/components/shared/flourishes/BorderCenterpiece";
import { OrnateVictoria } from "@/components/shared/flourishes/OrnateVictoria";
import { cn } from "@/lib/utils";
import BioAndSkills from "./BioAndSkills";
import HomeAbout from "./HomeAbout";
import HomeProjects from "./HomeProjects";
import HomeMotivationsAndRejections from "./HomeMotivationsAndRejections";

// Sepia + grain wash so the portrait reads as "aged" rather than a flat
// filter — same texture trick used on the header photos.
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
        className="object-cover sepia-[.35] contrast-125 saturate-125 brightness-95 grayscale"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[url('/old-paper.png')] bg-cover bg-center opacity-25 mix-blend-multiply"
      />
    </>
  );
}

// Oval frame: the opening in transparent-frame2.png is an ellipse, so the
// photo is clipped with rounded-full on a box shaped to that ellipse,
// then the ornate frame sits on top at full size, uniformly scaled.
function OvalFrame({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const sizes = "(max-width: 640px) 208px, (max-width: 768px) 256px, 320px";
  return (
    <div
      className={cn("relative aspect-square w-52 sm:w-64 md:w-80", className)}
    >
      <div className="absolute inset-x-[20%] inset-y-[14%] overflow-hidden rounded-full">
        <AgedPhoto src={src} alt={alt} sizes={sizes} />
      </div>
      <Image
        src="/transparent-frame2.png"
        alt=""
        aria-hidden
        fill
        sizes={sizes}
        className="pointer-events-none select-none object-contain"
      />
    </div>
  );
}

function HomeHero() {
  return (
    <section className="ornate-frame relative flex min-h-screen flex-col gap-6 border-3 border-double border-primary p-3 lg:p-6">
      <OrnateVictoria className="-top-1 -left-1" />
      <OrnateVictoria className="-top-1 -right-1 rotate-90" />
      <OrnateVictoria className="-bottom-1 -left-1 -rotate-90" />
      <OrnateVictoria className="-bottom-1 -right-1 rotate-180" />

      <div className="flex flex-col items-center gap-6 md:flex-row md:gap-10">
        <div className="order-2 text-center md:order-none md:text-left">
          <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            Rotten lab
          </h1>
          <p className="mt-3 text-muted-foreground">
            Hi, my name is Hwapyong M. Edouard. Am a backend developer. I
            created this website to show what am i worked on and what i am
            working on. I am always open to new ideas and collaborations, so
            feel free to reach out if you have any questions or suggestions. I
            hope you enjoy your time here and find something interesting
          </p>
        </div>
        <OvalFrame
          src="/biooid.jpeg"
          alt="Portrait"
          className="order-1 w-40 shrink-0 -rotate-2 sm:w-64 md:order-0 md:w-80"
        />
      </div>

      <BioAndSkills />
      <HomeAbout />
      <HomeProjects />
      <HomeMotivationsAndRejections />
    </section>
  );
}

export default HomeHero;

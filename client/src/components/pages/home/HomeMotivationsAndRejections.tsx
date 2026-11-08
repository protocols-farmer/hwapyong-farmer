//src/components/pages/home/HomeMotivationsAndRejections.tsx
"use client";

import { BorderCenterpiece } from "@/components/shared/flourishes/BorderCenterpiece";
import { OrnateVictoria } from "@/components/shared/flourishes/OrnateVictoria";

function HomeMotivationsAndRejections() {
  return (
    <div className="relative border-3 border-double  p-3 flex flex-col gap-3">
      <OrnateVictoria className="-top-1 -left-1" />
      <OrnateVictoria className="-top-1 -right-1 rotate-90" />
      <OrnateVictoria className="-bottom-1 -left-1 -rotate-90" />
      <OrnateVictoria className="-bottom-1 -right-1 rotate-180" />

      <BorderCenterpiece className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[60%] w-44 h-auto z-20" />
      <BorderCenterpiece className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[60%] w-44 h-auto rotate-180 z-20" />

      <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
        Motivation :
      </h4>

      <p className=" border-l-3 border-double pl-3 flex flex-col gap-3">
        I applied to 75+ colleges over 3 application periods and got 75+
        rejections. That's 3 gap years, man... All I wanted was a fully funded
        scholarship and access to their resources so I could do my own research.
        I grew up in a farming village in a low-income family, and I loved
        nature so much I thought I'd become a naturalist. But the curiosity to
        understand how the tech world works brought me here, and I've been
        teaching myself ever since.
      </p>
    </div>
  );
}
export default HomeMotivationsAndRejections;

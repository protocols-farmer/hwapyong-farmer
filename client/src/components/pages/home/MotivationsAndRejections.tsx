//src/components/pages/home/MotivationsAndRejections.tsx
"use client";

import { BorderCenterpiece } from "@/components/shared/flourishes/BorderCenterpiece";
import { OrnateVictoria } from "@/components/shared/flourishes/OrnateVictoria";

const rejections = [
  {
    collegeName: "Stanford University",
    year: 2020,
    reason: "Lack of extracurricular activities and low GPA.",
    rejectionTimes: 3,
    theirWebsite: "https://www.stanford.edu/",
  },
  {
    collegeName: "Massachusetts Institute of Technology (MIT)",
    year: 2021,
    reason:
      "Insufficient standardized test scores and lack of research experience.",
    rejectionTimes: 2,
    theirWebsite: "https://www.mit.edu/",
  },
  {
    collegeName: "Harvard University",
    year: 2022,
    reason:
      "Lack of research experience and lack of extracurricular activities.",
    rejectionTimes: 1,
    theirWebsite: "https://www.harvard.edu/",
  },
];

function MotivationsAndRejections() {
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
        Anyway, I had the courage to apply to 75+ colleges and got 75+ college
        rejections within 3 application periods. That's 3 years of gap years,
        man... Yeah, I had the courage to apply to top colleges below. I just
        wanted a fully funded scholarship, that's it, and access to their
        resources so I could do my own research. But I got what I deserved,
        including messages like, "Unfortunately, we can't let you in, bro. Your
        GPA is bad, and you don't know how to speak." I can teach myself stuff
        anyway if I have to. I grew up in a farming village, in a low-income
        family, of course. I loved nature a lot! I thought I'd become a
        naturalist or something like that, but the curiosity to understand how
        the tech world works brought me here, and I love tech-related stuff...
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {rejections.map((rejection) => {
          return (
            <div
              key={rejection.collegeName}
              className="border-3 border-double  p-3 bg-card flex flex-col gap-5 justify-between"
            >
              <div className="flex justify-between font-bold text-xs ">
                <h4 className="text-primary">{rejection.collegeName}</h4>
                <span>{rejection.year}</span>
              </div>

              <p className="text-xs">{rejection.reason}</p>

              <div className=" flex justify-between text-xs">
                <span className="text-primary font-bold">
                  Rejections: {rejection.rejectionTimes}
                </span>
                <a
                  href={rejection.theirWebsite}
                  className="hover:text-primary underline"
                >
                  Visit Website
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default MotivationsAndRejections;

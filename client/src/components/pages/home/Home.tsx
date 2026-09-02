//src/components/pages/home/Home.tsx
"use client";

import { BorderCenterpiece } from "@/components/shared/flourishes/BorderCenterpiece";
import BioAndSkills from "./BioAndSkills";
import HomeAbout from "./HomeAbout";
import HomeProjects from "./HomeProjects";
import MotivationsAndRejections from "./MotivationsAndRejections";
import { OrnateVictoria } from "@/components/shared/flourishes/OrnateVictoria";

function Home() {
  return (
    <section className="p-3 relative lg:p-6 min-h-screen border-3 border-double flex flex-col gap-6">
      <OrnateVictoria className="-top-1 -left-1" />
      <OrnateVictoria className="-top-1 -right-1 rotate-90" />
      <OrnateVictoria className="-bottom-1 -left-1 -rotate-90" />
      <OrnateVictoria className="-bottom-1 -right-1 rotate-180" />
      <BorderCenterpiece className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[60%] w-44 h-auto z-20" />
      <BorderCenterpiece className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[60%] w-44 h-auto rotate-180 z-20" />
      <div>
        <h1 className="font-bold">Rotten lab</h1>
        <p>
          I created this website to show what am i worked on and what i am
          working on. I hope you enjoy your time here and find something
          interesting. I am always open to new ideas and collaborations, so feel
          free to reach out if you have any questions or suggestions.
        </p>
      </div>

      <BioAndSkills />
      <HomeAbout />
      <HomeProjects />
      <MotivationsAndRejections />
    </section>
  );
}

export default Home;

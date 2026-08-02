//src/components/pages/about/AboutMe.tsx
"use client";

import CornerFlourish from "@/components/shared/CornerFlourish";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import HomeProjects from "@/components/pages/home/HomeProjects";
import AboutDiary from "@/components/pages/about/AboutDiary";

const timeline = [
  {
    date: "Aug 2023",
    label: "High School Graduation",
    detail:
      "Graduated with Physics, Chemistry, and Biology as main subjects with sub-math and E-ship. I left high school fascinated by both biology and computers, and that curiosity became the starting point of everything that followed.",
  },
  {
    date: "2023–2024",
    label: "Tutorial hell Developer",
    detail:
      "Started learning HTML, CSS, JavaScript, Node.js, Mongodb, and Express.js. Built every thing from videos and youtube like boring note-taking apps and even recreated a house-rental website using React before I fully understood the framework, hoping my projects would strengthen my college applications.",
  },
  {
    date: "2023–2025",
    label: "Years of College Rejections",
    detail:
      "Applied through the Common App and external applications. I received more than 80+ rejections. I received three partial scholarships that were still financially out of reach. I kept pursuing my dream of combining biology and computing in research, but my final application cycle ended with another rejection on April 1, 2025.",
  },
  {
    date: "Late 2025",
    label: "ALU Admission Without Financial Aid",
    detail:
      "I decided to apply for local universities and Earned admission to ALU Rwanda and deferred to the May intake. I was denied for full financial aid and also denied for student loan even after responsibly reporting a vulnerability in the government website for the financial loan system that was later fixed. Despite the setback, I remained committed to continuing my education.",
  },
  {
    date: "May 2026",
    label: "Current Chapter: ALU Student",
    detail:
      "Currently pursuing a Bachelor's in Entrepreneurial Leadership after being unable to enroll directly in Software Engineering because of my mathematics background. But thankfully I did a math test and won and now they claim am a qualified Software Engineering student. I mean come on really ? it's been 3 years in this field and after some 20 questions probability math test they claim am qualified for Software Engineering. I mean come on really ?",
  },

  {
    date: "Aug 2026 – Present",
    label: "I Finally Found My Direction",
    detail:
      "After years of trying to figure out where I belonged, I committed to becoming a Site Reliability Engineer. I'm now grinding Linux, Bash, C for systems fundamentals, Go as my professional language, Node.js and TypeScript for building products, PostgreSQL for data, Docker and Kubernetes for infrastructure, and Rust whenever low-level performance matters. Everything I learn now is aimed at becoming an exceptional backend and infrastructure engineer.",
  },
];

export default function AboutPage() {
  return (
    <section className="p-3 lg:p-6 min-h-screen border-3 border-double flex flex-col gap-6">
      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h1 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
          About Me
        </h1>
        <div className="border-l-3 border-double pl-3">
          <p className="font-bold ">This is my actual life story.</p>
        </div>
      </div>

      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
          The Journey
        </h4>

        <div className="border-l-3 border-double pl-3 flex flex-col gap-6">
          {timeline.map((entry, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="flex flex-col">
                <span className="text-primary font-bold">{entry.date}</span>
                <span className="font-bold">{entry.label}</span>
              </div>
              <p className="text-sm">{entry.detail}</p>
            </div>
          ))}
        </div>

        <div className="border-l-3 border-double pl-3 flex flex-col gap-1">
          <span className="font-bold text-primary">
            Plane story (Unfiltered)
          </span>
          <span className="font-bold">
            If you want my whole story about my life from childhood to now{" "}
            <Link href="/contact" className="text-primary underline">
              Contact me
            </Link>{" "}
            or read some in below diary.
          </span>
        </div>
      </div>

      <AboutDiary />

      <HomeProjects />

      <div className="flex gap-3 flex-wrap">
        <Button
          asChild
          variant="outline"
          className="border-3 border-double rounded-none"
        >
          <Link href="/contact">Contact Me</Link>
        </Button>

        <Button
          asChild
          variant="outline"
          className="border-3 border-double rounded-none"
        >
          <Link href="/computer">See My Work</Link>
        </Button>

        <Button
          asChild
          variant="outline"
          className="border-3 border-double rounded-none"
        >
          <a href="/cv.pdf" download>
            Download CV
          </a>
        </Button>
      </div>

      {/*what am chasing now and future plans */}
      <div className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
          The Truth
        </h4>

        <div className="border-l-3 border-double pl-3 flex flex-col gap-1">
          <span className="font-bold text-primary">
            What am i chasing now and future plans :
          </span>
          <p className="text-sm">
            I am chasing a career in software engineering and I still have a
            light spark for biology, but I am also interested in contributing to
            open-source projects and continuously improving my skills.
          </p>
        </div>
      </div>
    </section>
  );
}

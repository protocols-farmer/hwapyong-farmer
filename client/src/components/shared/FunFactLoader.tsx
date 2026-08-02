//src/components/shared/FunFactLoader.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface FunFactLoaderProps {
  title?: string;
  engine?: string;
  facts?: string[];
}

const DEFAULT_FACTS = [
  "The first computer virus was created in 1971. It was called the 'Creeper' and just printed: 'I'm the creeper, catch me if you can!'",
  "CAPTCHA stands for 'Completely Automated Public Turing test to tell Computers and Humans Apart'.",
  "In 1999, a 15-year-old hacked NASA and the Pentagon, causing a 21-day shutdown of their defense computers.",
  "SQL injection was first documented publicly in 1998. It is still one of the most common web vulnerabilities decades later.",
  "The term 'hacker' originally referred to highly skilled, creative programmers at MIT in the 1960s, not criminals.",
  "More than 90% of successful corporate cyberattacks begin with a simple phishing email.",
  "The ILOVEYOU bug in 2000 caused an estimated $10 billion in damages worldwide by overwriting personal files.",
];

export default function FunFactLoader({
  title = "Processing request...",
  engine,
  facts = DEFAULT_FACTS,
}: FunFactLoaderProps) {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!facts || facts.length <= 1) return;

    const intervalId = setInterval(() => {
      setIsFading(true);

      setTimeout(() => {
        setCurrentFactIndex((prev) => (prev + 1) % facts.length);
        setIsFading(false);
      }, 500);
    }, 4500);

    return () => clearInterval(intervalId);
  }, [facts]);

  const isClaude = engine?.toLowerCase() === "claude";
  const isGemini = engine?.toLowerCase() === "gemini";

  const engineColorClass = isClaude
    ? "border-orange-500 text-orange-500"
    : isGemini
      ? "border-blue-500 text-blue-500"
      : "border-primary text-primary";

  const engineBgClass = isClaude
    ? "bg-orange-500/10"
    : isGemini
      ? "bg-blue-500/10"
      : "bg-primary/10";

  const engineSolidClass = isClaude
    ? "bg-orange-500"
    : isGemini
      ? "bg-blue-500"
      : "bg-primary";

  return (
    <div className="w-full max-w-2xl mx-auto border-3 border-double bg-card flex flex-col overflow-hidden my-8">
      <div
        className={cn(
          "border-b-3 border-double px-4 py-2 flex items-center justify-between",
          engineBgClass,
          engineColorClass,
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">
          Retrieving Security Intel
        </span>
        <span className="text-[10px] font-bold uppercase opacity-70">
          Module: {engine?.toUpperCase() || "SYSTEM"}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row">
        <div
          className={cn(
            "relative w-full sm:w-48 h-48 border-b-3 sm:border-b-0 sm:border-r-3 border-double flex-shrink-0 bg-muted/30 group",
            engineColorClass,
          )}
        >
          <Image
            src="https://media1.tenor.com/m/qhfzQWre-ewAAAAC/dance-anime-girl.gif"
            alt="Processing Animation"
            fill
            unoptimized
            className="object-cover"
          />

          <div
            className={cn(
              "absolute inset-0 mix-blend-color opacity-30 pointer-events-none transition-opacity duration-500 group-hover:opacity-0",
              engineSolidClass,
            )}
          />
        </div>

        <div className="flex-1 flex flex-col p-6 justify-center min-h-[160px] relative">
          <span className="text-[10px] font-bold uppercase opacity-50 mb-2 block">
            Did you know?
          </span>
          <p
            className={cn(
              "text-xs font-bold leading-relaxed transition-opacity duration-500",
              isFading ? "opacity-0" : "opacity-100",
            )}
          >
            {facts[currentFactIndex]}
          </p>
        </div>
      </div>

      <div className="border-t-3 border-double p-3 flex flex-col gap-2 bg-background">
        <div className="flex justify-between items-center text-[10px] font-bold uppercase">
          <span className="opacity-70">Status Task</span>
          <span className={cn("animate-pulse", engineColorClass)}>{title}</span>
        </div>

        <div className="w-full h-1 bg-muted overflow-hidden relative">
          <div
            className={cn(
              "absolute top-0 bottom-0 left-0 w-1/3 animate-[slide_2s_ease-in-out_infinite]",
              engineSolidClass,
            )}
          />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `,
        }}
      />
    </div>
  );
}

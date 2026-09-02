// src/components/shared/flourishes/OrnateVictoria.tsx
import { cn } from "@/lib/utils";

export const OrnateVictoria = ({ className }: { className?: string }) => (
  <svg
    className={cn("absolute w-25 h-25 text-primary/50 z-10", className)}
    fill="currentColor" /* Paints the vintage details perfectly solid */
    viewBox="0 0 652 659" /* Matches your exact Figma dimensions */
    aria-hidden="true" /* Hides decorative vectors from screen readers */
  >
    <use href="#ornate-victoria" />
  </svg>
);

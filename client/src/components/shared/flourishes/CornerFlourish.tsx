// src/components/shared/flourishes/CornerFlourish.tsx
import { cn } from "@/lib/utils";

export const CornerFlourish = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 60 60"
    /* Kept your exact dimensions and color definitions */
    className={cn("absolute w-7 h-7 text-primary/50 z-10", className)}
    fill="none"
    stroke="currentColor"
    /* Let the paths inside your symbol handle their own stroke widths naturally */
    strokeLinecap="round"
    aria-hidden="true"
  >
    <use href="#corner-flourish" />
  </svg>
);

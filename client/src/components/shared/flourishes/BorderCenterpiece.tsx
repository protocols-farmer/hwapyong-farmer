// src/components/shared/flourishes/BorderCenterpiece.tsx
import { cn } from "@/lib/utils";

export const BorderCenterpiece = ({ className }: { className?: string }) => (
  <svg
    className={cn(
      " pointer-events-none w-full h-full text-primary/50",
      className,
    )}
    fill="currentColor"
    viewBox="0 0 1224 139"
    aria-hidden="true"
  >
    <use href="#border-centerpiece" />
  </svg>
);

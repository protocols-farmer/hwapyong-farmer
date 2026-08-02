//src/components/shared/CornerFlourish.tsx
import { cn } from "@/lib/utils";

const CornerFlourish = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 40 40"
    className={cn("absolute w-4 h-4 text-primary/40 z-10", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M38 2H10C5.58 2 2 5.58 2 10V38" />
  </svg>
);

export default CornerFlourish;

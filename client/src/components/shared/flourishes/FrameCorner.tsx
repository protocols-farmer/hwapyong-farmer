//src/components/shared/FrameCorner.tsx
import { cn } from "@/lib/utils";

/**
 * A larger, more elaborate cousin of CornerFlourish — meant for framing an
 * entire hero panel or page edge rather than a small card. Double-line
 * bracket, a bigger scrollwork coil, and a tiny three-petal accent at the
 * tip, like a corner lifted from an engraved title page.
 *
 * Sits well around w-12 h-12 to w-20 h-20. Rotate 90/180/270 for the other
 * three corners, same as CornerFlourish.
 */
const FrameCorner = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    className={cn("absolute w-16 h-16 text-primary/40 z-10", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    {/* outer bracket */}
    <path d="M94 8H38C21.4 8 8 21.4 8 38V94" />
    {/* inner echo, double-border motif */}
    <path d="M94 18H40C29 18 20 27 20 38V94" strokeWidth="1.25" opacity="0.6" />

    {/* large coiling tendril off the horizontal arm */}
    <path d="M70 8C55 8 45 18 45 31C45 40 52 47 61 47C68 47 73 41.5 73 35C73 30.5 69 27 64.5 27C61.5 27 59 29.3 59 32.2" />

    {/* mirrored coil off the vertical arm */}
    <path d="M8 70C8 55 18 45 31 45C40 45 47 52 47 61C47 68 41.5 73 35 73C30.5 73 27 69 27 64.5C27 61.5 29.3 59 32.2 59" />

    {/* three-petal accent at each coil's tip */}
    <path
      d="M59 32.2c1.6-2.3 4.4-2.3 6 0c-1.6 2.3-4.4 2.3-6 0z"
      fill="currentColor"
      stroke="none"
      opacity="0.6"
    />
    <path
      d="M32.2 59c-2.3 1.6-2.3 4.4 0 6c2.3-1.6 2.3-4.4 0-6z"
      fill="currentColor"
      stroke="none"
      opacity="0.6"
    />

    {/* small jewel at the very corner */}
    <circle cx="9" cy="9" r="2.2" fill="currentColor" stroke="none" />
  </svg>
);

export default FrameCorner;

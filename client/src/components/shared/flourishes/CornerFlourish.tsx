//src/components/shared/CornerFlourish.tsx
import { cn } from "@/lib/utils";

/**
 * Ornamental corner flourish — a double-line frame bracket with a pair of
 * coiling tendrils and two small "berry" accents, in the spirit of a
 * Victorian scrollwork corner. Origin sits at the top-left of the viewBox;
 * rotate 90/180/270 (as the Sidebar already does) to cover the other three
 * corners of a bordered panel.
 *
 * Slightly busier than a plain right-angle bracket, so give it a touch more
 * room than before — w-5 h-5 / w-6 h-6 reads better than w-4 h-4.
 */
const CornerFlourish = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 60 60"
    className={cn("absolute w-5 h-5 text-primary/50 z-10", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    {/* main frame bracket */}
    <path d="M56 4H18C10.3 4 4 10.3 4 18V56" />

    {/* inner echo line, evoking the site's border-double motif */}
    <path
      d="M56 10H20.5C15.2 10 11 14.3 11 19.6V56"
      strokeWidth="1.25"
      opacity="0.6"
    />

    {/* tendril curling off the horizontal arm */}
    <path d="M40 4C34 4 30 8 30 13C30 16.5 32.5 19 36 19C38.5 19 40.5 17 40.5 14.5C40.5 12.8 39 11.5 37.5 11.5" />

    {/* mirrored tendril curling off the vertical arm */}
    <path d="M4 40C4 34 8 30 13 30C16.5 30 19 32.5 19 36C19 38.5 17 40.5 14.5 40.5C12.8 40.5 11.5 39 11.5 37.5" />

    {/* berry accents at each tendril's tip */}
    <circle cx="37.5" cy="11.5" r="1.8" fill="currentColor" stroke="none" />
    <circle cx="11.5" cy="37.5" r="1.8" fill="currentColor" stroke="none" />
  </svg>
);

export default CornerFlourish;

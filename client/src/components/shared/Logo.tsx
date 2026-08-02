//src/components/shared/Logo.tsx
import Link from "next/link";

function Logo() {
  return (
    <div>
      {" "}
      <Link href="/">
        <span className="hidden md:inline-block font-bold text-primary">
          Rotten Lab
        </span>
      </Link>
    </div>
  );
}
export default Logo;

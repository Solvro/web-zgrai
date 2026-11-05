import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({
  size = "md",
  href,
  className,
}: {
  size?: "md" | "lg";
  href?: string;
  className?: string;
}) {
  const mark = (
    <span
      className={cn(
        "inline-flex items-baseline font-bold tracking-[-0.04em] text-ink",
        size === "lg" ? "text-2xl" : "text-[19px]",
        className,
      )}
    >
      zgr
      <span
        className={cn(
          "ml-0.5 bg-ink pb-0.5 tracking-[-0.02em] text-white",
          size === "lg" ? "rounded-[9px] px-[7px]" : "rounded-lg px-1.5",
        )}
      >
        ai
      </span>
      <span className="ml-px font-medium text-grey-light">.pl</span>
    </span>
  );
  if (!href) return mark;
  return (
    <Link href={href} aria-label="zgrai.pl, your problems">
      {mark}
    </Link>
  );
}

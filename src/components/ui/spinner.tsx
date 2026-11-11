import { cn } from "@/lib/utils";

export type SpinnerTone = "onBrand" | "brand";

/**
 * `onBrand` sits on filled violet / ink / pink buttons (lilac track, white arc).
 * `brand` sits on white, lilac or outline surfaces (lilac track, violet arc).
 */
export function Spinner({ tone = "brand", className }: { tone?: SpinnerTone; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 motion-reduce:animate-[spin_1.6s_linear_infinite]",
        tone === "onBrand" ? "border-lilac/35 border-t-white" : "border-lilac border-t-violet",
        className,
      )}
    />
  );
}

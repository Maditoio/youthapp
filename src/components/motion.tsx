import type { ReactNode } from "react";

/** Stable shell wrapper — no remount/fade on navigation. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return children;
}

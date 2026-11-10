"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

/** Clerk stays behind the existing screens. Without keys, the demo login is unchanged. */
export function AppProviders({ clerk, children }: { clerk: boolean; children: ReactNode }) {
  if (!clerk) return children;
  return <ClerkProvider>{children}</ClerkProvider>;
}

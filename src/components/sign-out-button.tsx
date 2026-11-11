"use client";

import { useClerk } from "@clerk/nextjs";
import { useTransition } from "react";
import { signOutAction } from "@/server/actions";

function JeuneseSignOutButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void signOutAction();
        });
      }}
    >
      {children}
    </button>
  );
}

function ClerkAwareSignOutButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const clerk = useClerk();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void (async () => {
            try {
              await clerk.signOut({ redirectUrl: undefined });
            } catch {
              // Jeunese cookie clear still runs.
            }
            await signOutAction();
          })();
        });
      }}
    >
      {children}
    </button>
  );
}

/** Clears Clerk first (when configured), then the Jeunese session cookie. */
export function SignOutButton(props: { children: React.ReactNode; className?: string }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <JeuneseSignOutButton {...props} />;
  }
  return <ClerkAwareSignOutButton {...props} />;
}

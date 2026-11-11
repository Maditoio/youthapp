"use client";

import { useClerk } from "@clerk/nextjs";
import { useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";
import { signOutAction } from "@/server/actions";

/** Full page load so no cached authenticated RSC payload or Clerk client state survives. */
function leave() {
  window.location.assign("/");
}

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
      aria-busy={pending || undefined}
      onClick={() => {
        startTransition(async () => {
          try {
            await signOutAction();
          } finally {
            leave();
          }
        });
      }}
    >
      {pending ? <Spinner /> : null}
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
      aria-busy={pending || undefined}
      onClick={() => {
        startTransition(async () => {
          // Jeunese cookie first: Clerk's signOut navigates away and would cut a later request short.
          try {
            await signOutAction();
          } catch (error) {
            console.error("jeunese_sign_out_failed", error);
          }
          try {
            await clerk.signOut({ redirectUrl: "/" });
          } catch (error) {
            console.error("clerk_sign_out_failed", error);
            try {
              await signOutAction({ revokeClerk: true });
            } catch {
              // Nothing left to try; the page reload below still drops client state.
            }
          }
          leave();
        });
      }}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}

/** Clears the Jeunese session cookie, then Clerk (when configured), then reloads on `/`. */
export function SignOutButton(props: { children: React.ReactNode; className?: string }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <JeuneseSignOutButton {...props} />;
  }
  return <ClerkAwareSignOutButton {...props} />;
}

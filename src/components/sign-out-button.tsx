"use client";

import { useClerk } from "@clerk/nextjs";
import { useState, type ButtonHTMLAttributes } from "react";
import { Spinner } from "@/components/ui/spinner";
import { signOutAction } from "@/server/actions";

type SignOutButtonProps = {
  children: React.ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "disabled" | "children">;

/** Full page load so no cached authenticated RSC payload or Clerk client state survives. */
function leave() {
  window.location.assign("/");
}

/**
 * Clerk's `signOut({ redirectUrl })` uses an awaitable App Router soft navigation that can hang
 * (nested transitions + post-sign-out `router.refresh()`), so we never await a Clerk redirect.
 * Clear the Clerk session, then hard-navigate ourselves.
 */
async function clearClerkSession(clerk: ReturnType<typeof useClerk>) {
  await Promise.race([
    clerk.signOut({ redirectUrl: undefined }),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 2500);
    }),
  ]);
}

function JeuneseSignOutButton({ children, className, ...rest }: SignOutButtonProps) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-busy={pending || undefined}
      {...rest}
      onClick={() => {
        if (pending) return;
        setPending(true);
        void (async () => {
          try {
            await signOutAction();
          } finally {
            leave();
          }
        })();
      }}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}

function ClerkAwareSignOutButton({ children, className, ...rest }: SignOutButtonProps) {
  const clerk = useClerk();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-busy={pending || undefined}
      {...rest}
      onClick={() => {
        if (pending) return;
        setPending(true);
        void (async () => {
          // Jeunese cookie first: a Clerk soft-redirect would cut a later cookie clear short.
          try {
            await signOutAction();
          } catch (error) {
            console.error("jeunese_sign_out_failed", error);
          }
          try {
            await clearClerkSession(clerk);
          } catch (error) {
            console.error("clerk_sign_out_failed", error);
            try {
              await signOutAction({ revokeClerk: true });
            } catch {
              // Nothing left to try; the hard navigation below still drops client state.
            }
          }
          leave();
        })();
      }}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  );
}

/** Clears the Jeunese session cookie, then Clerk (when configured), then reloads on `/`. */
export function SignOutButton(props: SignOutButtonProps) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <JeuneseSignOutButton {...props} />;
  }
  return <ClerkAwareSignOutButton {...props} />;
}

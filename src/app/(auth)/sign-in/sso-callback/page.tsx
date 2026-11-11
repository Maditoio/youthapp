import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { clerkContinueHref } from "@/lib/auth/clerk-continue";

/** Completes Google OAuth then continues to /sign-in/clerk for Jeunese session bind. */
export default function SsoCallbackPage() {
  const continueUrl = clerkContinueHref();
  return (
    <AuthenticateWithRedirectCallback
      continueSignUpUrl={continueUrl}
      signInUrl={continueUrl}
      signUpUrl={continueUrl}
    />
  );
}

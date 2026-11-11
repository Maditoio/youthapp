import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/** Completes Google OAuth then continues to /sign-in/clerk for Jeunese session bind. */
export default function SsoCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      continueSignUpUrl="/sign-in/clerk"
      signInUrl="/sign-in/clerk"
      signUpUrl="/sign-in/clerk"
    />
  );
}

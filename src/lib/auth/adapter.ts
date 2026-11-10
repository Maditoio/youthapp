import type { AuthAdapter, AuthSession } from "./types";

/**
 * Clerk-backed adapter stub.
 * Env vars are read when present; no secret values are invented.
 * Replace stub methods with @clerk/nextjs once compliance clears (M3).
 */
function readClerkPublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

function readClerkSecretKey(): string | undefined {
  return process.env.CLERK_SECRET_KEY;
}

export function isClerkConfigured(): boolean {
  return Boolean(readClerkPublishableKey() && readClerkSecretKey());
}

const stubSession: AuthSession = {
  user: null,
  isAuthenticated: false,
};

export const authAdapter: AuthAdapter = {
  async getSession() {
    // Stub: always unauthenticated until Clerk SDK is wired in M3.
    if (!isClerkConfigured()) {
      return stubSession;
    }
    return stubSession;
  },

  getSignInUrl(returnTo = "/investor") {
    const base = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in";
    return `${base}?redirect_url=${encodeURIComponent(returnTo)}`;
  },

  getSignUpUrl(returnTo = "/investor") {
    const base = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up";
    return `${base}?redirect_url=${encodeURIComponent(returnTo)}`;
  },

  getSignOutUrl() {
    return "/";
  },
};

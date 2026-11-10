export type AuthUser = {
  id: string;
  email: string | null;
  fullName: string | null;
};

export type AuthSession = {
  user: AuthUser | null;
  isAuthenticated: boolean;
};

/**
 * Auth adapter surface — Clerk (or alternate) implements this.
 * Milestone 1 ships a stub; real Clerk wiring lands with RBAC in M3.
 */
export type AuthAdapter = {
  getSession: () => Promise<AuthSession>;
  getSignInUrl: (returnTo?: string) => string;
  getSignUpUrl: (returnTo?: string) => string;
  getSignOutUrl: () => string;
};

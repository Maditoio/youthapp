/**
 * App-level feature flags and display config.
 * Demo mode stays on until legal/payment partners are approved.
 */
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
/** Process-test rail: demoMode or explicit SANDBOX_PAYMENTS_ENABLED=true (no live money). */
const sandboxPaymentsEnabled =
  demoMode || process.env.SANDBOX_PAYMENTS_ENABLED === "true";

export const appConfig = {
  productName: "Jeunese",
  tagline: "Invest together. Build together. Own together.",
  brandLine: "Built by Congo. Owned by Congolese.",
  /** Fictional banner/login/seed content — not required for sandbox payment testing. */
  demoMode,
  /** Sandbox simulate-payment UI + webhook + server action (process testing only). */
  sandboxPaymentsEnabled,
  defaultLocale: "fr" as const,
  locales: ["fr", "en"] as const,
} as const;

export type AppLocale = (typeof appConfig.locales)[number];

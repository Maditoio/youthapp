/**
 * App-level feature flags and display config.
 * Demo mode stays on until legal/payment partners are approved.
 */
export const appConfig = {
  productName: "Jeunese",
  tagline: "Invest together. Build together. Own together.",
  brandLine: "Built by Congo. Owned by Congolese.",
  /** Sandbox / fictional content only — no live money. */
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  defaultLocale: "fr" as const,
  locales: ["fr", "en"] as const,
} as const;

export type AppLocale = (typeof appConfig.locales)[number];

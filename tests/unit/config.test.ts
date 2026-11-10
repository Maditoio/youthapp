import { describe, expect, it } from "vitest";
import { appConfig } from "@/lib/config";
import { isAppLocale, defaultLocale, locales } from "@/lib/i18n/config";
import { isClerkConfigured, authAdapter } from "@/lib/auth/adapter";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";

describe("appConfig", () => {
  it("uses Jeunese as the product display name", () => {
    expect(appConfig.productName).toBe("Jeunese");
  });

  it("defaults to French and demo mode", () => {
    expect(appConfig.defaultLocale).toBe("fr");
    expect(appConfig.demoMode).toBe(true);
  });
});

describe("i18n", () => {
  it("supports fr and en only at launch", () => {
    expect(locales).toEqual(["fr", "en"]);
    expect(defaultLocale).toBe("fr");
    expect(isAppLocale("fr")).toBe(true);
    expect(isAppLocale("en")).toBe(true);
    expect(isAppLocale("ln")).toBe(false);
  });

  it("keeps French and English dictionaries in sync by key shape", () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(fr.common).sort()).toEqual(
      Object.keys(en.common).sort(),
    );
    expect(Object.keys(fr.nav).sort()).toEqual(Object.keys(en.nav).sort());
  });
});

describe("auth adapter stub", () => {
  it("reports Clerk as unconfigured without env secrets", () => {
    expect(isClerkConfigured()).toBe(false);
  });

  it("returns an unauthenticated stub session", async () => {
    const session = await authAdapter.getSession();
    expect(session.isAuthenticated).toBe(false);
    expect(session.user).toBeNull();
  });

  it("points sign-in and sign-up at local routes", () => {
    expect(authAdapter.getSignInUrl()).toContain("/sign-in");
    expect(authAdapter.getSignUpUrl()).toContain("/sign-up");
  });
});

import { appConfig, type AppLocale } from "@/lib/config";

export const defaultLocale: AppLocale = appConfig.defaultLocale;
export const locales = appConfig.locales;

export const localeCookieName = "jeunese_locale";

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

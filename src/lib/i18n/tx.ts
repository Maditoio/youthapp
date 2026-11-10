import type { AppLocale } from "@/lib/config";

export function tx(locale: AppLocale, fr: string, en: string): string {
  return locale === "fr" ? fr : en;
}

export function localeTag(locale: AppLocale): string {
  return locale === "fr" ? "fr-FR" : "en-GB";
}

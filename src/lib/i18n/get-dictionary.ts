import { cookies } from "next/headers";
import type { AppLocale } from "@/lib/config";
import { defaultLocale, isAppLocale, localeCookieName } from "./config";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";

const dictionaries = {
  fr,
  en,
} as const;

export type Dictionary = typeof fr;

export async function getLocale(): Promise<AppLocale> {
  const jar = await cookies();
  const value = jar.get(localeCookieName)?.value;
  if (value && isAppLocale(value)) {
    return value;
  }
  return defaultLocale;
}

export async function getDictionary(locale?: AppLocale): Promise<Dictionary> {
  const resolved = locale ?? (await getLocale());
  return dictionaries[resolved];
}

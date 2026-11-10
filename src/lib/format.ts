import type { AppLocale } from "@/lib/config";
import { localeTag } from "@/lib/i18n/tx";

export function formatMoney(
  minor: number,
  currency: string,
  locale: AppLocale,
): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function formatDate(iso: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Convert a major-unit string such as "100" or "100.50" to integer minor units. */
export function parseMajorToMinor(input: string): number | null {
  const trimmed = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

export function maskValue(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 4) return "••••";
  return `${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}

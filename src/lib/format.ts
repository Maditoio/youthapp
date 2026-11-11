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

/** Format minor units for money inputs (e.g. 10050 → "100.50"). */
export function formatMinorInput(minor: number): string {
  if (!Number.isFinite(minor)) return "";
  return (minor / 100).toFixed(2);
}

/** Slice an ISO timestamp to `datetime-local` value (`YYYY-MM-DDTHH:mm`). */
export function toDatetimeLocalValue(iso: string): string {
  if (!iso) return "";
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(iso);
  return match?.[1] ?? "";
}

/** Normalize a `datetime-local` value into an ISO UTC-ish string with seconds. */
export function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return null;
  return `${trimmed}:00.000Z`;
}

export function maskValue(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 4) return "••••";
  return `${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}

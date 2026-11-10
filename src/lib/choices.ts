import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";

export const GENDERS = ["female", "male", "undisclosed"] as const;
export type Gender = (typeof GENDERS)[number];

export function isGender(value: string): value is Gender {
  return (GENDERS as readonly string[]).includes(value);
}

export function readGender(value: unknown): Gender | null {
  return typeof value === "string" && isGender(value) ? value : null;
}

export function genderLabel(locale: AppLocale, code: Gender): string {
  if (code === "female") return tx(locale, "Femme", "Woman");
  if (code === "male") return tx(locale, "Homme", "Man");
  return tx(locale, "Ne pas préciser", "Prefer not to say");
}

/** Countries the platform already permits for residence, identity and offerings. */
export const PERMITTED_COUNTRIES = [
  { code: "CD", fr: "République démocratique du Congo", en: "Democratic Republic of the Congo" },
  { code: "CG", fr: "Congo", en: "Congo" },
  { code: "FR", fr: "France", en: "France" },
  { code: "BE", fr: "Belgique", en: "Belgium" },
  { code: "US", fr: "États-Unis", en: "United States" },
  { code: "CA", fr: "Canada", en: "Canada" },
  { code: "GB", fr: "Royaume-Uni", en: "United Kingdom" },
  { code: "ZA", fr: "Afrique du Sud", en: "South Africa" },
  { code: "RW", fr: "Rwanda", en: "Rwanda" },
  { code: "AO", fr: "Angola", en: "Angola" },
] as const;

export function isPermittedCountry(code: string): boolean {
  return PERMITTED_COUNTRIES.some((country) => country.code === code);
}

export const DOCUMENT_TYPES = [
  { code: "national_id", fr: "Carte d'identité", en: "National ID" },
  { code: "passport", fr: "Passeport", en: "Passport" },
  { code: "residence_permit", fr: "Titre de séjour", en: "Residence permit" },
] as const;

export function isDocumentType(code: string): boolean {
  return DOCUMENT_TYPES.some((item) => item.code === code);
}

/** Industry strings already stored on seeded projects. */
export const INDUSTRIES = [
  { code: "Agroalimentaire", fr: "Agroalimentaire", en: "Food processing" },
  { code: "Emballage", fr: "Emballage", en: "Packaging" },
] as const;

export function isIndustry(code: string): boolean {
  return INDUSTRIES.some((item) => item.code === code);
}

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

/** Industry codes stored on projects/issuers (value = French operational label). */
export const INDUSTRIES = [
  { code: "Agroalimentaire", fr: "Agroalimentaire", en: "Food processing" },
  { code: "Agriculture", fr: "Agriculture", en: "Agriculture" },
  { code: "Élevage", fr: "Élevage", en: "Livestock" },
  { code: "Pêche", fr: "Pêche", en: "Fishing" },
  { code: "Emballage", fr: "Emballage", en: "Packaging" },
  { code: "Manufacturing", fr: "Manufacture", en: "Manufacturing" },
  { code: "Énergie", fr: "Énergie", en: "Energy" },
  { code: "Mines", fr: "Mines", en: "Mining" },
  { code: "Construction", fr: "Construction", en: "Construction" },
  { code: "Transport", fr: "Transport et logistique", en: "Transport and logistics" },
  { code: "Commerce", fr: "Commerce", en: "Trade / retail" },
  { code: "Technologie", fr: "Technologie", en: "Technology" },
  { code: "Télécoms", fr: "Télécommunications", en: "Telecoms" },
  { code: "Santé", fr: "Santé", en: "Healthcare" },
  { code: "Éducation", fr: "Éducation", en: "Education" },
  { code: "Finance", fr: "Services financiers", en: "Financial services" },
  { code: "Tourisme", fr: "Tourisme et hôtellerie", en: "Tourism and hospitality" },
  { code: "Immobilier", fr: "Immobilier", en: "Real estate" },
  { code: "Médias", fr: "Médias et divertissement", en: "Media and entertainment" },
  { code: "Autre", fr: "Autre", en: "Other" },
] as const;

export function isIndustry(code: string): boolean {
  return INDUSTRIES.some((item) => item.code === code);
}

import { cn } from "@/lib/utils";
import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";
import {
  DOCUMENT_TYPES,
  GENDERS,
  INDUSTRIES,
  PERMITTED_COUNTRIES,
  genderLabel,
  isDocumentType,
  isGender,
  isIndustry,
  isPermittedCountry,
} from "@/lib/choices";

export const choiceField = "h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm text-ink";

export function GenderSelect({
  locale,
  name = "gender",
  defaultValue = "",
  required = false,
  className,
}: {
  locale: AppLocale;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  const selected = isGender(defaultValue) ? defaultValue : "";
  return (
    <select name={name} required={required} defaultValue={selected} className={cn(choiceField, className)}>
      <option value="">{tx(locale, "Choisir le genre", "Choose a gender")}</option>
      {GENDERS.map((code) => (
        <option key={code} value={code}>
          {genderLabel(locale, code)}
        </option>
      ))}
    </select>
  );
}

export function CountrySelect({
  locale,
  name,
  defaultValue = "",
  required = false,
  placeholder,
  className,
}: {
  locale: AppLocale;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const selected = isPermittedCountry(defaultValue) ? defaultValue : "";
  return (
    <select name={name} required={required} defaultValue={selected} className={cn(choiceField, className)}>
      <option value="">{placeholder ?? tx(locale, "Choisir un pays", "Choose a country")}</option>
      {PERMITTED_COUNTRIES.map((country) => (
        <option key={country.code} value={country.code}>
          {tx(locale, country.fr, country.en)}
        </option>
      ))}
    </select>
  );
}

export function DocumentTypeSelect({
  locale,
  name = "documentType",
  defaultValue = "national_id",
  className,
}: {
  locale: AppLocale;
  name?: string;
  defaultValue?: string;
  className?: string;
}) {
  const selected = isDocumentType(defaultValue) ? defaultValue : "national_id";
  return (
    <select name={name} required defaultValue={selected} className={cn(choiceField, className)}>
      {DOCUMENT_TYPES.map((item) => (
        <option key={item.code} value={item.code}>
          {tx(locale, item.fr, item.en)}
        </option>
      ))}
    </select>
  );
}

export function IndustrySelect({
  locale,
  name = "industry",
  defaultValue = "",
  className,
}: {
  locale: AppLocale;
  name?: string;
  defaultValue?: string;
  className?: string;
}) {
  const selected = isIndustry(defaultValue) ? defaultValue : "";
  return (
    <select name={name} required defaultValue={selected} className={cn(choiceField, className)}>
      <option value="">{tx(locale, "Choisir un secteur", "Choose an industry")}</option>
      {INDUSTRIES.map((item) => (
        <option key={item.code} value={item.code}>
          {tx(locale, item.fr, item.en)}
        </option>
      ))}
    </select>
  );
}

/** Select backed by DB rows. Shows a clear empty state when there is nothing to choose. */
export function EntitySelect({
  locale,
  name,
  options,
  emptyLabel,
  chooseLabel,
  required = true,
  className,
  defaultValue = "",
}: {
  locale: AppLocale;
  name: string;
  options: { value: string; label: string }[];
  emptyLabel: string;
  chooseLabel?: string;
  required?: boolean;
  className?: string;
  defaultValue?: string;
}) {
  if (options.length === 0) {
    return (
      <select
        name={name}
        required={required}
        disabled
        defaultValue=""
        aria-invalid
        className={cn(choiceField, "opacity-70", className)}
      >
        <option value="">{emptyLabel}</option>
      </select>
    );
  }
  const selected = options.some((item) => item.value === defaultValue) ? defaultValue : "";
  return (
    <select name={name} required={required} defaultValue={selected} className={cn(choiceField, className)}>
      <option value="">{chooseLabel ?? tx(locale, "Choisir…", "Choose…")}</option>
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

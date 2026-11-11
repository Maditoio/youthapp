"use client";

import { useActionState } from "react";
import { kycAction, nominationAction, onboardingAction, profileAction } from "@/server/actions";
import { CountrySelect, DocumentTypeSelect, GenderSelect } from "@/components/choice-fields";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import type { AppLocale } from "@/lib/config";
import { errorCopy } from "@/server/domain/errors";
import { tx } from "@/lib/i18n/tx";

const field = "h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm";

export function ProfileForm({
  locale,
  defaults,
}: {
  locale: AppLocale;
  defaults: Record<string, string>;
}) {
  const [state, action, pending] = useActionState(profileAction, {});
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <label className="text-sm font-semibold">
        {tx(locale, "Prénom", "First name")}
        <input name="firstName" defaultValue={defaults.firstName ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Deuxième prénom", "Middle name")}
        <input name="middleName" defaultValue={defaults.middleName ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Nom", "Last name")}
        <input name="lastName" defaultValue={defaults.lastName ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Téléphone", "Phone")}
        <input name="phone" defaultValue={defaults.phone ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Pays de résidence", "Country of residence")}
        <CountrySelect locale={locale} name="country" defaultValue={defaults.country ?? ""} required className="mt-1" />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Genre", "Gender")}
        <GenderSelect locale={locale} defaultValue={defaults.gender ?? ""} required className="mt-1" />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Date de naissance", "Date of birth")}
        <DatePicker locale={locale} name="dateOfBirth" defaultValue={defaults.dateOfBirth ?? ""} className="mt-1" />
        <span className="mt-1 block text-xs font-normal text-muted">
          {tx(locale, "Ouvert de 18 à 35 ans.", "Open from age 18 through 35.")}
        </span>
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Nationalité", "Nationality")}
        <CountrySelect
          locale={locale}
          name="nationality"
          defaultValue={defaults.nationality ?? ""}
          placeholder={tx(locale, "Choisir la nationalité", "Choose a nationality")}
          className="mt-1"
        />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Adresse", "Address")}
        <input name="addressLine" defaultValue={defaults.addressLine ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Ville", "City")}
        <input name="city" defaultValue={defaults.city ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Résidence fiscale", "Tax residency")}
        <CountrySelect
          locale={locale}
          name="taxResidency"
          defaultValue={defaults.taxResidency ?? ""}
          placeholder={tx(locale, "Choisir la résidence fiscale", "Choose a tax residency")}
          className="mt-1"
        />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Identifiant fiscal", "Tax id")}
        <input name="taxId" defaultValue={defaults.taxId ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Origine des fonds", "Source of funds")}
        <input name="sourceOfFunds" defaultValue={defaults.sourceOfFunds ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Libellé de paiement", "Payout label")}
        <input name="payoutLabel" defaultValue={defaults.payoutLabel ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Langue", "Language")}
        <select name="language" defaultValue={defaults.language} className={`${field} mt-1`}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Personne politiquement exposée", "Politically exposed person")}
        <select name="pep" defaultValue={defaults.pep} className={`${field} mt-1`}>
          <option value="NO">{tx(locale, "Non", "No")}</option>
          <option value="YES">{tx(locale, "Oui", "Yes")}</option>
        </select>
      </label>
      {state.error ? <p className="text-sm text-danger md:col-span-2">{errorCopy[state.error]?.[locale] ?? state.error}</p> : null}
      {state.ok ? <p className="text-sm text-emerald-700 md:col-span-2">{tx(locale, "Enregistré.", "Saved.")}</p> : null}
      <Button type="submit" disabled={pending}>{tx(locale, "Enregistrer", "Save")}</Button>
    </form>
  );
}

export function OnboardingForm({
  locale,
  defaults,
}: {
  locale: AppLocale;
  defaults: Record<string, string>;
}) {
  const [state, action, pending] = useActionState(onboardingAction, {});
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <label className="text-sm font-semibold">
        {tx(locale, "Prénom légal", "Legal first name")}
        <input name="firstName" required defaultValue={defaults.firstName ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Deuxième prénom", "Middle name")}
        <input name="middleName" defaultValue={defaults.middleName ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Nom légal", "Legal last name")}
        <input name="lastName" required defaultValue={defaults.lastName ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Téléphone", "Phone")}
        <input name="phone" required defaultValue={defaults.phone ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Pays de résidence", "Country of residence")}
        <CountrySelect locale={locale} name="country" defaultValue={defaults.country ?? "CD"} required className="mt-1" />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Genre", "Gender")}
        <GenderSelect locale={locale} defaultValue={defaults.gender ?? ""} required className="mt-1" />
        <span className="mt-1 block text-xs font-normal text-muted">
          {tx(locale, "Donnée démographique uniquement.", "Demographic information only.")}
        </span>
      </label>
      <label className="text-sm font-semibold md:col-span-2">
        {tx(locale, "Date de naissance", "Date of birth")}
        <DatePicker locale={locale} name="dateOfBirth" required defaultValue={defaults.dateOfBirth ?? ""} className="mt-1" />
        <span className="mt-1 block text-xs font-normal text-muted">
          {tx(locale, "Ouvert de 18 à 35 ans inclus.", "Open from age 18 through 35 inclusive.")}
        </span>
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Nationalité", "Nationality")}
        <CountrySelect
          locale={locale}
          name="nationality"
          defaultValue={defaults.nationality ?? ""}
          placeholder={tx(locale, "Choisir la nationalité", "Choose a nationality")}
          className="mt-1"
        />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Ville", "City")}
        <input name="city" defaultValue={defaults.city ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold md:col-span-2">
        {tx(locale, "Adresse", "Address")}
        <input name="addressLine" defaultValue={defaults.addressLine ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Résidence fiscale", "Tax residency")}
        <CountrySelect
          locale={locale}
          name="taxResidency"
          defaultValue={defaults.taxResidency ?? ""}
          placeholder={tx(locale, "Choisir la résidence fiscale", "Choose a tax residency")}
          className="mt-1"
        />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Identifiant fiscal", "Tax id")}
        <input name="taxId" defaultValue={defaults.taxId ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Origine des fonds", "Source of funds")}
        <input name="sourceOfFunds" defaultValue={defaults.sourceOfFunds ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Libellé de paiement", "Payout label")}
        <input name="payoutLabel" defaultValue={defaults.payoutLabel ?? ""} className={`${field} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Langue", "Language")}
        <select name="language" defaultValue={defaults.language ?? locale} className={`${field} mt-1`}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className="text-sm font-semibold">
        {tx(locale, "Personne politiquement exposée", "Politically exposed person")}
        <select name="pep" defaultValue={defaults.pep ?? "NO"} className={`${field} mt-1`}>
          <option value="NO">{tx(locale, "Non", "No")}</option>
          <option value="YES">{tx(locale, "Oui", "Yes")}</option>
        </select>
      </label>
      {state.error ? <p className="text-sm text-danger md:col-span-2">{errorCopy[state.error]?.[locale] ?? state.error}</p> : null}
      <Button type="submit" className="md:col-span-2" disabled={pending}>
        {tx(locale, "Terminer l'inscription", "Finish onboarding")}
      </Button>
    </form>
  );
}

export function KycForm({
  locale,
  country,
  gender = "",
  preferredDocumentTypes,
}: {
  locale: AppLocale;
  country: string;
  gender?: string;
  preferredDocumentTypes?: string[];
}) {
  const [state, action, pending] = useActionState(kycAction, {});
  return (
    <form action={action} className="space-y-3 rounded-[28px] bg-white p-5">
      <p className="text-sm text-muted">
        {tx(locale, "Document officiel du pays de résidence. Un passeport d'un autre pays part en revue manuelle et n'autorise pas l'investissement.", "Official document from the country of residence. A passport from another country is manually reviewed and does not allow investment.")}
      </p>
      <label className="block text-sm font-semibold">
        {tx(locale, "Genre", "Gender")}
        <GenderSelect locale={locale} defaultValue={gender} required className="mt-1" />
      </label>
      <label className="block text-sm font-semibold">
        {tx(locale, "Type de document", "Document type")}
        <DocumentTypeSelect locale={locale} allowedCodes={preferredDocumentTypes} className="mt-1" />
      </label>
      <label className="block text-sm font-semibold">
        {tx(locale, "Pays émetteur", "Issuing country")}
        <CountrySelect locale={locale} name="issuingCountry" defaultValue={country} required className="mt-1" />
      </label>
      <input name="documentNumber" required placeholder={tx(locale, "Numéro", "Number")} className={field} />
      <label className="block text-sm font-semibold">
        {tx(locale, "Expiration", "Expiry")}
        <DatePicker
          locale={locale}
          name="expiryDate"
          label={tx(locale, "Expiration", "Expiry")}
          className={`${field} mt-1`}
        />
      </label>
      {state.error ? <p className="text-sm text-danger">{errorCopy[state.error]?.[locale] ?? state.error}</p> : null}
      {state.ok ? <p className="text-sm text-emerald-700">{tx(locale, "Dossier soumis. L'envoi d'un fichier ne l'approuve pas.", "File submitted. Uploading a file does not approve it.")}</p> : null}
      <Button type="submit" disabled={pending}>{tx(locale, "Soumettre", "Submit")}</Button>
    </form>
  );
}

export function NominationForm({ locale }: { locale: AppLocale }) {
  const [state, action, pending] = useActionState(nominationAction, {});
  return (
    <form action={action} className="space-y-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="grid gap-2 rounded-2xl bg-white p-3 md:grid-cols-3">
          <input name={`name${index}`} placeholder={tx(locale, "Nom", "Name")} className={field} />
          <input name={`rel${index}`} placeholder={tx(locale, "Lien", "Relationship")} className={field} />
          <GenderSelect locale={locale} name={`gender${index}`} />
          <input name={`email${index}`} placeholder="email" className={field} />
          <input name={`phone${index}`} placeholder="+243..." className={field} />
          <input name={`bps${index}`} placeholder={tx(locale, "points sur 10000", "basis points of 10000")} className={field} />
        </div>
      ))}
      <label className="flex gap-2 text-sm">
        <input type="checkbox" name="ack" />
        {tx(locale, "Je comprends que ceci est une déclaration de volonté, pas un transfert d'actions.", "I understand this is a statement of wishes, not a transfer of shares.")}
      </label>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" name="activate" />
        {tx(locale, "Activer (le total doit être exactement 10000 points, soit 100 %)", "Activate (the total must be exactly 10000 points, meaning 100%)")}
      </label>
      {state.error ? <p className="text-sm text-danger">{errorCopy[state.error]?.[locale] ?? state.error}</p> : null}
      {state.ok ? <p className="text-sm text-emerald-700">{tx(locale, "Nomination enregistrée.", "Nomination saved.")}</p> : null}
      <Button type="submit" disabled={pending}>{tx(locale, "Enregistrer la nomination", "Save nomination")}</Button>
    </form>
  );
}

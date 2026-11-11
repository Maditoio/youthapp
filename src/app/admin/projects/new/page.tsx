import Link from "next/link";
import { createProjectAction } from "@/server/actions";
import { EntitySelect, IndustrySelect } from "@/components/choice-fields";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { errorCopy } from "@/server/domain/errors";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function NewProject({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const error = (await searchParams).error;
  const issuers = session.db.issuers;
  const field = "h-12 w-full rounded-2xl border border-border bg-white px-3";
  return (
    <form action={createProjectAction} className="max-w-xl space-y-2">
      <h1 className="text-3xl font-bold">{tx(locale, "Brouillon de projet", "Project draft")}</h1>
      {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
      {issuers.length === 0 ? (
        <p className="rounded-2xl bg-lilac/60 px-4 py-3 text-sm text-ink">
          {tx(
            locale,
            "Aucun émetteur n'existe encore. Créez d'abord une société émettrice.",
            "No issuer exists yet. Create an issuer company first.",
          )}{" "}
          <Link href="/admin/issuers" className="font-semibold text-violet">
            {tx(locale, "Ajouter un émetteur", "Add an issuer")}
          </Link>
        </p>
      ) : null}
      <EntitySelect
        locale={locale}
        name="issuerId"
        options={issuers.map((issuer) => ({ value: issuer.id, label: issuer.legalName }))}
        emptyLabel={tx(locale, "Aucun émetteur — créez-en un d'abord", "No issuers — create one first")}
        chooseLabel={tx(locale, "Choisir l'émetteur", "Choose an issuer")}
      />
      <input name="titleFr" required placeholder="Titre français" className={field} />
      <input name="titleEn" required placeholder="English title" className={field} />
      <input name="location" required placeholder="Kinshasa" className={field} />
      <IndustrySelect locale={locale} />
      <label className="block text-sm font-semibold">
        {tx(locale, "Usage des fonds", "Use of the money")}
        <select name="purpose" required defaultValue="FINANCE" className={`mt-1 ${field}`}>
          <option value="START">{tx(locale, "Créer la société", "Start the company")}</option>
          <option value="FINANCE">{tx(locale, "Financer la société existante", "Finance the existing company")}</option>
        </select>
      </label>
      <input name="min" required placeholder={tx(locale, "Levée minimum USD", "Minimum raise USD")} className={field} />
      <input name="max" required placeholder={tx(locale, "Levée maximum USD", "Maximum raise USD")} className={field} />
      <input name="price" required placeholder={tx(locale, "Prix d'une action USD", "Price per share USD")} className={field} />
      <input name="shares" required type="number" placeholder={tx(locale, "Actions offertes", "Shares offered")} className={field} />
      <SubmitButton size="sm" disabled={issuers.length === 0}>
        {tx(locale, "Créer le brouillon", "Create draft")}
      </SubmitButton>
    </form>
  );
}

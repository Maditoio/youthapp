import { createProjectAction } from "@/server/actions";
import { IndustrySelect } from "@/components/choice-fields";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { errorCopy } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

export default async function NewProject({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const error = (await searchParams).error;
  return (
    <form action={createProjectAction} className="max-w-xl space-y-2">
      <h1 className="text-3xl font-bold">{tx(locale, "Brouillon de projet", "Project draft")}</h1>
      {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
      <select name="issuerId" className="h-12 w-full rounded-2xl border bg-white px-3">
        {session.db.issuers.map((issuer) => <option key={issuer.id} value={issuer.id}>{issuer.legalName}</option>)}
      </select>
      <input name="titleFr" required placeholder="Titre français" className="h-12 w-full rounded-2xl border px-3" />
      <input name="titleEn" required placeholder="English title" className="h-12 w-full rounded-2xl border px-3" />
      <input name="location" required placeholder="Kinshasa" className="h-12 w-full rounded-2xl border px-3" />
      <IndustrySelect locale={locale} />
      <label className="block text-sm font-semibold">
        {tx(locale, "Usage des fonds", "Use of the money")}
        <select name="purpose" required defaultValue="FINANCE" className="mt-1 h-12 w-full rounded-2xl border bg-white px-3">
          <option value="START">{tx(locale, "Créer la société", "Start the company")}</option>
          <option value="FINANCE">{tx(locale, "Financer la société existante", "Finance the existing company")}</option>
        </select>
      </label>
      <input name="min" required placeholder={tx(locale, "Levée minimum USD", "Minimum raise USD")} className="h-12 w-full rounded-2xl border px-3" />
      <input name="max" required placeholder={tx(locale, "Levée maximum USD", "Maximum raise USD")} className="h-12 w-full rounded-2xl border px-3" />
      <input name="price" required placeholder={tx(locale, "Prix d'une action USD", "Price per share USD")} className="h-12 w-full rounded-2xl border px-3" />
      <input name="shares" required type="number" placeholder={tx(locale, "Actions offertes", "Shares offered")} className="h-12 w-full rounded-2xl border px-3" />
      <button className="rounded-full bg-violet px-4 py-2 font-semibold text-white">{tx(locale, "Créer le brouillon", "Create draft")}</button>
    </form>
  );
}

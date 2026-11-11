import Link from "next/link";
import { createIssuerAction } from "@/server/actions";
import { IndustrySelect } from "@/components/choice-fields";
import { ModalOpenLink, SearchParamModal } from "@/components/search-param-modal";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { errorCopy } from "@/server/domain/errors";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function IssuersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; modal?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const params = await searchParams;
  const error = params.error;
  const field = "h-12 w-full rounded-2xl border border-border bg-white px-3 text-sm";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{tx(locale, "Émetteurs", "Issuers")}</h1>
          <p className="mt-1 text-sm text-muted">
            {tx(
              locale,
              "Une société émettrice doit exister avant de créer un projet ou une offre.",
              "An issuer company must exist before you can create a project or offering.",
            )}
          </p>
        </div>
        <ModalOpenLink
          href="/admin/issuers?modal=new"
          className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
        >
          {tx(locale, "Nouvel émetteur", "New issuer")}
        </ModalOpenLink>
      </div>

      <div className="space-y-3">
        {session.db.issuers.length === 0 ? (
          <p className="rounded-[24px] bg-white p-4 text-sm text-muted">
            {tx(locale, "Aucun émetteur pour l'instant.", "No issuers yet.")}
          </p>
        ) : (
          session.db.issuers.map((issuer) => (
            <article key={issuer.id} className="rounded-[24px] bg-white p-4 text-sm">
              <p className="font-bold">{issuer.legalName}</p>
              <p>
                {issuer.registrationNumber} · {issuer.jurisdiction} · {issuer.companyStatus}
              </p>
              <p>{issuer.registeredAddress}</p>
              <p className="mt-1 text-muted">
                {issuer.industry}
                {issuer.website ? ` · ${issuer.website}` : ""}
              </p>
            </article>
          ))
        )}
      </div>

      <p className="text-sm">
        <Link href="/admin/projects?modal=new" className="font-semibold text-violet">
          {tx(locale, "Créer un brouillon de projet →", "Create a project draft →")}
        </Link>
      </p>

      <SearchParamModal
        title={tx(locale, "Nouvel émetteur", "New issuer")}
        description={tx(
          locale,
          "Renseignez la société émettrice avant de créer un projet.",
          "Enter the issuer company before creating a project.",
        )}
        size="lg"
      >
        <form action={createIssuerAction} className="space-y-2">
          {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
          <input type="hidden" name="next" value="/admin/issuers" />
          <input name="legalName" required placeholder={tx(locale, "Raison sociale", "Legal name")} className={field} />
          <input
            name="tradingName"
            placeholder={tx(locale, "Nom commercial (optionnel)", "Trading name (optional)")}
            className={field}
          />
          <input
            name="registrationNumber"
            required
            placeholder={tx(locale, "N° RCCM / enregistrement", "Registration number")}
            className={field}
          />
          <input
            name="jurisdiction"
            required
            defaultValue={tx(locale, "République démocratique du Congo", "Democratic Republic of the Congo")}
            placeholder={tx(locale, "Juridiction", "Jurisdiction")}
            className={field}
          />
          <input
            name="legalForm"
            required
            defaultValue="Société anonyme"
            placeholder={tx(locale, "Forme juridique", "Legal form")}
            className={field}
          />
          <input
            name="registeredAddress"
            required
            placeholder={tx(locale, "Siège social", "Registered address")}
            className={field}
          />
          <IndustrySelect locale={locale} />
          <input name="website" placeholder="https://" className={field} />
          <SubmitButton size="sm">{tx(locale, "Créer l'émetteur", "Create issuer")}</SubmitButton>
        </form>
      </SearchParamModal>
    </div>
  );
}

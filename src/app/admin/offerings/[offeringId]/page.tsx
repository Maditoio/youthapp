import { notFound } from "next/navigation";
import { AdminReasonField } from "@/components/admin-reason-field";
import { ModalOpenLink, SearchParamModal } from "@/components/search-param-modal";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { offeringTransitionAction } from "@/server/actions";
import { errorCopy } from "@/server/domain/errors";
import { OFFERING_TRANSITIONS } from "@/server/domain/finance";
import { interestDemand } from "@/server/domain/mutate";
import { getSession } from "@/server/auth/session";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function OfferingAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ offeringId: string }>;
  searchParams: Promise<{ error?: string; modal?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const { offeringId } = await params;
  const query = await searchParams;
  const error = query.error;
  const offering = session.db.offerings.find((item) => item.id === offeringId);
  if (!offering) notFound();
  const project = session.db.projects.find((item) => item.id === offering.projectId);
  const next = OFFERING_TRANSITIONS[offering.status];
  const demand = interestDemand(session.db, offering.id);
  const interests = session.db.offeringInterests
    .filter((item) => item.offeringId === offering.id && item.status === "ACTIVE")
    .map((item) => {
      const profile = session.db.investorProfiles.find((row) => row.id === item.investorProfileId);
      return { item, profile };
    });
  const fillPct =
    offering.minimumRaiseMinor > 0
      ? Math.min(999, Math.round((demand.amountMinor / offering.minimumRaiseMinor) * 100))
      : 0;

  const interestColumns: DataTableColumn[] = [
    { id: "investor", header: tx(locale, "Investisseur", "Investor"), sortable: true },
    { id: "amount", header: tx(locale, "Montant", "Amount"), align: "right", sortable: true },
    { id: "shares", header: tx(locale, "Actions", "Shares"), align: "right", sortable: true },
    { id: "remind", header: tx(locale, "Rappel", "Remind"), sortable: true },
  ];
  const interestRows: DataTableRow[] = interests.map(({ item, profile }) => {
    const investor = profile
      ? `${profile.legalFirstName} ${profile.legalLastName} · ${profile.investorNumber}`
      : item.userId;
    const amount = formatMoney(item.intendedAmountMinor, offering.currencyCode, locale);
    const remind = item.remindAtOpen ? tx(locale, "Oui", "Yes") : tx(locale, "Non", "No");
    return {
      id: item.id,
      searchValue: `${investor} ${amount} ${item.intendedShareQuantity} ${remind}`,
      sortValues: {
        investor,
        amount: item.intendedAmountMinor,
        shares: item.intendedShareQuantity,
        remind,
      },
      cells: {
        investor: <span className="font-semibold">{investor}</span>,
        amount,
        shares: item.intendedShareQuantity,
        remind,
      },
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{tx(locale, offering.nameFr, offering.nameEn)}</h1>
          <p>{offering.status}</p>
          {project ? (
            <p className="mt-1 text-sm">
              <a className="font-semibold text-link" href={`/admin/projects/${project.id}`}>
                {tx(locale, "Éditer le contenu du projet et de l'offre", "Edit project and offering content")}
              </a>
            </p>
          ) : null}
        </div>
        {next.length > 0 ? (
          <ModalOpenLink
            href={`/admin/offerings/${offering.id}?modal=transition`}
            className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
          >
            {tx(locale, "Changer le statut", "Change status")}
          </ModalOpenLink>
        ) : null}
      </div>
      {next.length === 0 ? (
        <p className="text-sm text-muted">{tx(locale, "Aucune transition disponible.", "No transitions available.")}</p>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold">{tx(locale, "Demande indicative (EOI)", "Indicative demand (EOI)")}</h2>
          <p className="mt-1 text-sm text-muted">
            {demand.count} {tx(locale, "intérêt(s) actifs", "active interest(s)")} ·{" "}
            {formatMoney(demand.amountMinor, offering.currencyCode, locale)} · {demand.shareQuantity}{" "}
            {tx(locale, "actions", "shares")} · {fillPct}%{" "}
            {tx(locale, "du minimum", "of minimum")} (
            {formatMoney(offering.minimumRaiseMinor, offering.currencyCode, locale)})
          </p>
        </div>
        <DataTable
          locale={locale}
          columns={interestColumns}
          rows={interestRows}
          emptyMessage={tx(locale, "Aucun intérêt pour l'instant.", "No interest yet.")}
        />
      </section>

      <SearchParamModal
        param="modal"
        value="transition"
        title={tx(locale, "Transition d'offre", "Offering transition")}
        description={tx(
          locale,
          "Utilisez un bouton de statut pour soumettre. Entrée dans le motif ne change pas le statut.",
          "Use a status button to submit. Enter in the reason field does not change status.",
        )}
      >
        <form action={offeringTransitionAction} className="space-y-2">
          {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
          <input type="hidden" name="offeringId" value={offering.id} />
          <AdminReasonField
            placeholder={tx(locale, "Motif", "Reason")}
            className="h-11 w-full rounded-2xl border px-3"
          />
          <div className="flex flex-wrap gap-2">
            {next.map((status) => (
              <SubmitButton key={status} name="to" value={status} size="sm" className="text-xs">
                {status}
              </SubmitButton>
            ))}
          </div>
        </form>
      </SearchParamModal>
    </div>
  );
}

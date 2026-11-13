import { approveAllotmentAction, prepareAllotmentAction } from "@/server/actions";
import { AdminStepUpField } from "@/components/admin-step-up-field";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { errorCopy } from "@/server/domain/errors";
import { getSession } from "@/server/auth/session";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const error = (await searchParams).error;
  const db = session.db;
  const waiting = db.subscriptions.filter((item) => item.status === "PAID_AWAITING_CLOSING");
  const waitingByOffering = new Map<string, typeof waiting>();
  for (const sub of waiting) {
    const list = waitingByOffering.get(sub.offeringId) ?? [];
    list.push(sub);
    waitingByOffering.set(sub.offeringId, list);
  }
  const preparedBatches = db.allotmentBatches.filter((batch) => batch.status === "PREPARED");
  const hasPassword = Boolean(session.user.passwordHash);
  const ownStaffCode =
    db.staffProfiles.find((item) => item.userId === session.user.id && item.status === "ACTIVE")?.mfaCodeDisplay ??
    null;

  const preparedColumns: DataTableColumn[] = [
    { id: "offering", header: tx(locale, "Offre", "Offering"), sortable: true },
    { id: "count", header: tx(locale, "Souscriptions", "Subscriptions"), align: "right", sortable: true },
    { id: "preparer", header: tx(locale, "Préparé par", "Prepared by"), sortable: true },
  ];

  const preparedRows: DataTableRow[] = preparedBatches.map((batch) => {
    const offering = db.offerings.find((item) => item.id === batch.offeringId);
    const preparer = db.users.find((item) => item.id === batch.preparedBy);
    const offeringName = offering ? tx(locale, offering.nameFr, offering.nameEn) : batch.offeringId;
    const preparerName = preparer
      ? `${preparer.legalFirstName} ${preparer.legalLastName}`
      : batch.preparedBy;
    return {
      id: batch.id,
      searchValue: `${offeringName} ${preparerName} ${batch.subscriptionIds.length}`,
      sortValues: {
        offering: offeringName,
        count: batch.subscriptionIds.length,
        preparer: preparerName,
      },
      cells: {
        offering: <span className="font-semibold">{offeringName}</span>,
        count: batch.subscriptionIds.length,
        preparer: preparerName,
      },
      actions: (
        <form action={approveAllotmentAction} className="flex min-w-[14rem] flex-col gap-2">
          <input type="hidden" name="batchId" value={batch.id} />
          <AdminStepUpField
            locale={locale}
            hasPassword={hasPassword}
            ownStaffCode={ownStaffCode}
            className="h-10 w-full rounded-2xl border px-3 text-sm"
          />
          <SubmitButton size="sm">{tx(locale, "Approuver l'émission", "Approve issuance")}</SubmitButton>
        </form>
      ),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{tx(locale, "Registre et allotissement", "Register and allotment")}</h1>
        {error ? <p className="mt-2 text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
        <p className="mt-1 text-sm text-muted">
          {tx(
            locale,
            "Les souscriptions payées sont groupées par offre, puis émises. Ce registre n'est pas présenté comme le registre statutaire légal.",
            "Paid subscriptions are grouped by offering, then issued. This register is not presented as the statutory legal register.",
          )}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">{tx(locale, "En attente d'allotissement", "Awaiting allotment")}</h2>
        {waitingByOffering.size === 0 ? (
          <p className="rounded-[24px] border border-border bg-white p-4 text-sm text-muted">
            {tx(locale, "Aucune souscription payée en attente d'allotissement.", "No paid subscriptions awaiting allotment.")}
          </p>
        ) : (
          [...waitingByOffering.entries()].map(([offeringId, subs]) => {
            const offering = db.offerings.find((item) => item.id === offeringId);
            const project = offering ? db.projects.find((item) => item.id === offering.projectId) : null;
            const issuer = offering ? db.issuers.find((item) => item.id === offering.issuerId) : null;
            const title = offering ? tx(locale, offering.nameFr, offering.nameEn) : offeringId;
            const projectTitle = project ? tx(locale, project.titleFr, project.titleEn) : null;
            const columns: DataTableColumn[] = [
              { id: "select", header: tx(locale, "Inclure", "Include"), align: "center" },
              { id: "reference", header: tx(locale, "Référence", "Reference"), sortable: true },
              { id: "investor", header: tx(locale, "Investisseur", "Investor"), sortable: true },
              { id: "shares", header: tx(locale, "Actions", "Shares"), align: "right", sortable: true },
              { id: "amount", header: tx(locale, "Montant", "Amount"), align: "right", sortable: true },
            ];
            const rows: DataTableRow[] = subs.map((sub) => {
              const profile = db.investorProfiles.find((item) => item.id === sub.investorProfileId);
              const investor = profile
                ? `${profile.investorNumber} · ${profile.legalFirstName} ${profile.legalLastName}`
                : sub.investorProfileId;
              const amount = formatMoney(sub.totalMinor, sub.currencyCode, locale);
              return {
                id: sub.id,
                searchValue: `${sub.reference} ${investor} ${sub.shareQuantity} ${amount}`,
                sortValues: {
                  reference: sub.reference,
                  investor,
                  shares: sub.shareQuantity,
                  amount: sub.totalMinor,
                },
                cells: {
                  select: (
                    <input
                      type="checkbox"
                      name="subscriptionId"
                      value={sub.id}
                      defaultChecked
                      className="size-4"
                      aria-label={sub.reference}
                    />
                  ),
                  reference: <span className="font-semibold">{sub.reference}</span>,
                  investor,
                  shares: sub.shareQuantity,
                  amount,
                },
              };
            });
            return (
              <form key={offeringId} action={prepareAllotmentAction} className="space-y-3">
                <input type="hidden" name="offeringId" value={offeringId} />
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="text-sm text-muted">
                    {[projectTitle, issuer?.legalName, offering?.status].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <DataTable
                  locale={locale}
                  columns={columns}
                  rows={rows}
                  searchable
                  emptyMessage={tx(locale, "Aucune souscription.", "No subscriptions.")}
                />
                <SubmitButton size="sm">{tx(locale, "Préparer le lot", "Prepare batch")}</SubmitButton>
              </form>
            );
          })
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{tx(locale, "Lots préparés", "Prepared batches")}</h2>
        <p className="text-xs text-muted">
          {tx(
            locale,
            "La référence registre (REG-…) est générée automatiquement à l'approbation.",
            "The register reference (REG-…) is generated automatically on approval.",
          )}
        </p>
        <DataTable
          locale={locale}
          columns={preparedColumns}
          rows={preparedRows}
          emptyMessage={tx(locale, "Aucun lot préparé.", "No prepared batches.")}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{tx(locale, "Écritures", "Events")}</h2>
        <DataTable
          locale={locale}
          columns={
            [
              {
                id: "type",
                header: tx(locale, "Type", "Type"),
                sortable: true,
                filter: {
                  options: uniqueFilterOptions(db.shareholdingEvents.map((event) => event.eventType)),
                  allLabel: tx(locale, "Tous les types", "All types"),
                },
              },
              {
                id: "delta",
                header: tx(locale, "Quantité", "Quantity"),
                align: "right",
                sortable: true,
              },
              { id: "investor", header: tx(locale, "Investisseur", "Investor"), sortable: true },
            ] satisfies DataTableColumn[]
          }
          rows={db.shareholdingEvents.map((event) => {
            const profile = db.investorProfiles.find((item) => item.id === event.investorProfileId);
            const investor = profile ? profile.investorNumber : event.investorProfileId;
            return {
              id: event.id,
              searchValue: `${event.eventType} ${event.shareQuantityDelta} ${investor}`,
              filterValues: { type: event.eventType },
              sortValues: {
                type: event.eventType,
                delta: event.shareQuantityDelta,
                investor,
              },
              cells: {
                type: <span className="font-semibold">{event.eventType}</span>,
                delta: event.shareQuantityDelta,
                investor,
              },
            } satisfies DataTableRow;
          })}
          emptyMessage={tx(locale, "Aucune écriture.", "No events.")}
        />
      </section>
    </div>
  );
}

import { approveAllotmentAction, prepareAllotmentAction } from "@/server/actions";
import { AdminStepUpField } from "@/components/admin-step-up-field";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { errorCopy } from "@/server/domain/errors";
import { getSession } from "@/server/auth/session";
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

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Registre et allotissement", "Register and allotment")}</h1>
      {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
      <p className="text-sm text-muted">
        {tx(
          locale,
          "Les souscriptions payées sont groupées par offre, puis émises. Ce registre n'est pas présenté comme le registre statutaire légal.",
          "Paid subscriptions are grouped by offering, then issued. This register is not presented as the statutory legal register.",
        )}
      </p>

      {waitingByOffering.size === 0 ? (
        <p className="rounded-[24px] bg-white p-4 text-sm text-muted">
          {tx(locale, "Aucune souscription payée en attente d'allotissement.", "No paid subscriptions awaiting allotment.")}
        </p>
      ) : (
        [...waitingByOffering.entries()].map(([offeringId, subs]) => {
          const offering = db.offerings.find((item) => item.id === offeringId);
          const project = offering ? db.projects.find((item) => item.id === offering.projectId) : null;
          const issuer = offering ? db.issuers.find((item) => item.id === offering.issuerId) : null;
          const title = offering
            ? tx(locale, offering.nameFr, offering.nameEn)
            : offeringId;
          const projectTitle = project ? tx(locale, project.titleFr, project.titleEn) : null;
          return (
            <form key={offeringId} action={prepareAllotmentAction} className="space-y-3 rounded-[24px] bg-white p-4 text-sm">
              <input type="hidden" name="offeringId" value={offeringId} />
              <div>
                <p className="font-bold">{title}</p>
                <p className="text-muted">
                  {[projectTitle, issuer?.legalName, offering?.status].filter(Boolean).join(" · ")}
                </p>
              </div>
              <ul className="space-y-2">
                {subs.map((sub) => {
                  const profile = db.investorProfiles.find((item) => item.id === sub.investorProfileId);
                  const investorLabel = profile
                    ? `${profile.investorNumber} · ${profile.legalFirstName} ${profile.legalLastName}`
                    : sub.investorProfileId;
                  return (
                    <label key={sub.id} className="flex items-start gap-2">
                      <input type="checkbox" name="subscriptionId" value={sub.id} defaultChecked className="mt-1" />
                      <span>
                        {sub.reference} · {sub.shareQuantity} {tx(locale, "actions", "shares")}
                        <span className="block text-muted">{investorLabel}</span>
                      </span>
                    </label>
                  );
                })}
              </ul>
              <SubmitButton size="sm">{tx(locale, "Préparer le lot", "Prepare batch")}</SubmitButton>
            </form>
          );
        })
      )}

      {preparedBatches.map((batch) => {
        const offering = db.offerings.find((item) => item.id === batch.offeringId);
        const preparer = db.users.find((item) => item.id === batch.preparedBy);
        return (
          <form key={batch.id} action={approveAllotmentAction} className="space-y-2 rounded-[24px] bg-white p-4 text-sm">
            <input type="hidden" name="batchId" value={batch.id} />
            <p className="font-bold">
              {offering ? tx(locale, offering.nameFr, offering.nameEn) : batch.offeringId}
            </p>
            <p className="text-muted">
              {batch.subscriptionIds.length} {tx(locale, "souscription(s)", "subscription(s)")} ·{" "}
              {tx(locale, "préparé par", "prepared by")}{" "}
              {preparer ? `${preparer.legalFirstName} ${preparer.legalLastName}` : batch.preparedBy}
            </p>
            <p className="text-xs text-muted">
              {tx(
                locale,
                "La référence registre (REG-…) est générée automatiquement à l'approbation.",
                "The register reference (REG-…) is generated automatically on approval.",
              )}
            </p>
            <AdminStepUpField
              locale={locale}
              hasPassword={hasPassword}
              ownStaffCode={ownStaffCode}
              className="h-11 w-full rounded-2xl border px-3"
            />
            <SubmitButton size="sm">{tx(locale, "Approuver l'émission", "Approve issuance")}</SubmitButton>
          </form>
        );
      })}

      <h2 className="text-xl font-bold">{tx(locale, "Écritures", "Events")}</h2>
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
        emptyMessage={tx(locale, "Aucune écriture pour l'instant.", "No events yet.")}
      />
    </div>
  );
}

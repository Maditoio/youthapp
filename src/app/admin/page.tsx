import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { formatMoney } from "@/lib/format";
import { tx } from "@/lib/i18n/tx";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { getSession } from "@/server/auth/session";
import { fundingProgress } from "@/server/domain/finance";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const db = session.db;
  const byStatus = db.investorProfiles.reduce<Record<string, number>>((acc, item) => {
    acc[item.onboardingStatus] = (acc[item.onboardingStatus] ?? 0) + 1;
    return acc;
  }, {});
  const offering = db.offerings.find((item) => item.status === "OPEN");
  const progress = offering ? fundingProgress(db, offering.id) : null;
  const cards = [
    [tx(locale, "Investisseurs", "Investors"), String(db.investorProfiles.length)],
    [tx(locale, "Émetteurs actifs", "Active issuers"), String(db.issuers.filter((item) => item.companyStatus === "ACTIVE").length)],
    [tx(locale, "Offres ouvertes", "Open offerings"), String(db.offerings.filter((item) => item.status === "OPEN").length)],
    [tx(locale, "Souscriptions payées non émises", "Paid, not issued"), String(db.subscriptions.filter((item) => item.status === "PAID_AWAITING_CLOSING").length)],
    [tx(locale, "Lots en préparation", "Batches prepared"), String(db.allotmentBatches.filter((item) => item.status === "PREPARED").length)],
    [tx(locale, "Tickets ouverts", "Open tickets"), String(db.supportTickets.filter((item) => item.status !== "CLOSED").length)],
  ];

  const kycColumns: DataTableColumn[] = [
    { id: "status", header: tx(locale, "Statut KYC / onboarding", "KYC / onboarding status"), sortable: true },
    { id: "count", header: tx(locale, "Nombre", "Count"), align: "right", sortable: true },
  ];
  const kycRows: DataTableRow[] = Object.entries(byStatus).map(([status, count]) => ({
    id: status,
    searchValue: `${status} ${count}`,
    sortValues: { status, count },
    cells: {
      status: <span className="font-semibold">{status}</span>,
      count,
    },
  }));

  const progressColumns: DataTableColumn[] = [
    { id: "metric", header: tx(locale, "Indicateur", "Metric"), sortable: true },
    { id: "amount", header: tx(locale, "Montant", "Amount"), align: "right", sortable: true },
  ];
  const progressRows: DataTableRow[] = progress
    ? [
        {
          id: "confirmed",
          searchValue: "confirmed",
          sortValues: { metric: "confirmed", amount: progress.confirmedMinor },
          cells: {
            metric: tx(locale, "Paiements confirmés", "Confirmed payments"),
            amount: formatMoney(progress.confirmedMinor, offering!.currencyCode, locale),
          },
        },
        {
          id: "settled",
          searchValue: "settled",
          sortValues: { metric: "settled", amount: progress.settledMinor },
          cells: {
            metric: tx(locale, "Réglés", "Settled"),
            amount: formatMoney(progress.settledMinor, offering!.currencyCode, locale),
          },
        },
        {
          id: "allotted",
          searchValue: "allotted",
          sortValues: { metric: "allotted", amount: progress.allottedMinor },
          cells: {
            metric: tx(locale, "Alloués", "Allotted"),
            amount: formatMoney(progress.allottedMinor, offering!.currencyCode, locale),
          },
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{tx(locale, "Pilotage", "Operations")}</h1>
        <p className="mt-1 text-sm text-muted">
          {tx(
            locale,
            "Les montants confirmés et réglés sont séparés. Rien ici n'est appelé « fonds levés ».",
            "Confirmed and settled amounts stay separate. Nothing here is called “funds raised”.",
          )}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-[24px] border border-border bg-white p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="text-3xl font-bold text-ink">{value}</p>
          </article>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{tx(locale, "Vérification", "Verification")}</h2>
        <DataTable
          locale={locale}
          columns={kycColumns}
          rows={kycRows}
          searchable={false}
          pageSize={25}
          emptyMessage={tx(locale, "Aucun investisseur.", "No investors.")}
        />
      </section>

      {progress ? (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">
            {tx(locale, "Offre ouverte — progression", "Open offering — progress")}
          </h2>
          <DataTable
            locale={locale}
            columns={progressColumns}
            rows={progressRows}
            searchable={false}
            pageSize={10}
          />
        </section>
      ) : null}
    </div>
  );
}

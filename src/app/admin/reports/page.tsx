import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { fundingProgress } from "@/server/domain/finance";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const db = session.db;

  const columns: DataTableColumn[] = [
    { id: "offering", header: tx(locale, "Offre", "Offering"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(db.offerings.map((item) => item.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "initiated", header: tx(locale, "Initiées", "Initiated"), align: "right", sortable: true },
    { id: "confirmed", header: tx(locale, "Confirmées", "Confirmed"), align: "right", sortable: true },
    { id: "settled", header: tx(locale, "Réglées", "Settled"), align: "right", sortable: true },
    { id: "allotted", header: tx(locale, "Allouées", "Allotted"), align: "right", sortable: true },
  ];

  const rows: DataTableRow[] = db.offerings.map((offering) => {
    const progress = fundingProgress(db, offering.id);
    const name = tx(locale, offering.nameFr, offering.nameEn);
    return {
      id: offering.id,
      searchValue: `${name} ${offering.status}`,
      filterValues: { status: offering.status },
      sortValues: {
        offering: name,
        status: offering.status,
        initiated: progress.initiatedMinor,
        confirmed: progress.confirmedMinor,
        settled: progress.settledMinor,
        allotted: progress.allottedMinor,
      },
      cells: {
        offering: <span className="font-semibold">{name}</span>,
        status: offering.status,
        initiated: formatMoney(progress.initiatedMinor, offering.currencyCode, locale),
        confirmed: formatMoney(progress.confirmedMinor, offering.currencyCode, locale),
        settled: formatMoney(progress.settledMinor, offering.currencyCode, locale),
        allotted: formatMoney(progress.allottedMinor, offering.currencyCode, locale),
      },
    };
  });

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Rapports", "Reports")}</h1>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucune offre.", "No offerings.")}
      />
    </div>
  );
}

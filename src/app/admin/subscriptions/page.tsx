import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SubscriptionsAdmin() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();

  const columns: DataTableColumn[] = [
    { id: "reference", header: tx(locale, "Référence", "Reference"), sortable: true },
    { id: "investor", header: tx(locale, "Investisseur", "Investor"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(session.db.subscriptions.map((sub) => sub.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "amount", header: tx(locale, "Montant", "Amount"), align: "right", sortable: true },
    { id: "shares", header: tx(locale, "Actions", "Shares"), align: "right", sortable: true },
  ];

  const rows: DataTableRow[] = session.db.subscriptions.map((sub) => {
    const profile = session.db.investorProfiles.find((item) => item.id === sub.investorProfileId);
    const investor = profile?.investorNumber ?? sub.investorProfileId;
    const amount = formatMoney(sub.totalMinor, sub.currencyCode, locale);
    return {
      id: sub.id,
      searchValue: `${sub.reference} ${investor} ${sub.status} ${amount} ${sub.shareQuantity}`,
      filterValues: { status: sub.status },
      sortValues: {
        reference: sub.reference,
        investor,
        status: sub.status,
        amount: sub.totalMinor,
        shares: sub.shareQuantity,
      },
      cells: {
        reference: <span className="font-semibold">{sub.reference}</span>,
        investor,
        status: sub.status,
        amount,
        shares: sub.shareQuantity,
      },
    };
  });

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Souscriptions", "Subscriptions")}</h1>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucune souscription.", "No subscriptions.")}
      />
    </div>
  );
}

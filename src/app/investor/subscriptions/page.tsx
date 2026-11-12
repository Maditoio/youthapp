import Link from "next/link";
import { redirect } from "next/navigation";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { formatDate, formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { investorSnapshot } from "@/server/view";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const snap = investorSnapshot(session.db, session.user.id);
  const subscriptions = snap?.subscriptions ?? [];

  const columns: DataTableColumn[] = [
    { id: "project", header: tx(locale, "Projet", "Project"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(subscriptions.map(({ subscription }) => subscription.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "shares", header: tx(locale, "Actions", "Shares"), align: "right", sortable: true },
    { id: "amount", header: tx(locale, "Montant", "Amount"), align: "right", sortable: true },
    { id: "when", header: tx(locale, "Date", "Date"), sortable: true, hideOnMobile: true },
  ];

  const rows: DataTableRow[] = subscriptions.map(({ subscription, project }) => {
    const projectTitle = tx(locale, project.titleFr, project.titleEn);
    const amount = formatMoney(subscription.totalMinor, subscription.currencyCode, locale);
    const when = formatDate(subscription.createdAt, locale);
    return {
      id: subscription.id,
      searchValue: `${projectTitle} ${subscription.status} ${subscription.shareQuantity} ${amount} ${when}`,
      filterValues: { status: subscription.status },
      sortValues: {
        project: projectTitle,
        status: subscription.status,
        shares: subscription.shareQuantity,
        amount: subscription.totalMinor,
        when: subscription.createdAt,
      },
      cells: {
        project: (
          <Link href={`/investor/subscriptions/${subscription.id}`} className="font-semibold text-violet">
            {projectTitle}
          </Link>
        ),
        status: subscription.status,
        shares: subscription.shareQuantity,
        amount,
        when,
      },
      actions: (
        <Link href={`/investor/subscriptions/${subscription.id}`} className="text-sm font-semibold text-violet">
          {tx(locale, "Ouvrir", "Open")}
        </Link>
      ),
    };
  });

  return (
    <div className="space-y-3 px-4 md:px-0">
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

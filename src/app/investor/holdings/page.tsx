import Link from "next/link";
import { redirect } from "next/navigation";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { investorSnapshot } from "@/server/view";

export const dynamic = "force-dynamic";

export default async function HoldingsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const snap = investorSnapshot(session.db, session.user.id);
  const holdings = snap?.holdings ?? [];
  const pending =
    snap?.subscriptions.filter(
      (item) =>
        item.subscription.status === "PAID_AWAITING_CLOSING" || item.subscription.status === "PENDING_PAYMENT",
    ) ?? [];

  const holdingColumns: DataTableColumn[] = [
    { id: "issuer", header: tx(locale, "Émetteur", "Issuer"), sortable: true },
    { id: "class", header: tx(locale, "Classe", "Class"), sortable: true },
    { id: "quantity", header: tx(locale, "Quantité", "Quantity"), align: "right", sortable: true },
    { id: "issued", header: tx(locale, "Sur le registre", "On register"), align: "right", sortable: true },
  ];

  const holdingRows: DataTableRow[] = holdings.map((holding) => ({
    id: holding.shareClass.id,
    searchValue: `${holding.issuer.legalName} ${holding.shareClass.className} ${holding.quantity} ${holding.issued}`,
    sortValues: {
      issuer: holding.issuer.legalName,
      class: holding.shareClass.className,
      quantity: holding.quantity,
      issued: holding.issued,
    },
    cells: {
      issuer: (
        <Link href={`/investor/holdings/${holding.shareClass.id}`} className="font-semibold text-violet">
          {holding.issuer.legalName}
        </Link>
      ),
      class: holding.shareClass.className,
      quantity: holding.quantity,
      issued: holding.issued,
    },
    actions: (
      <Link href={`/investor/holdings/${holding.shareClass.id}`} className="text-sm font-semibold text-violet">
        {tx(locale, "Ouvrir", "Open")}
      </Link>
    ),
  }));

  const pendingColumns: DataTableColumn[] = [
    { id: "project", header: tx(locale, "Projet", "Project"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(pending.map(({ subscription }) => subscription.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "amount", header: tx(locale, "Montant", "Amount"), align: "right", sortable: true },
  ];

  const pendingRows: DataTableRow[] = pending.map(({ subscription, project }) => {
    const projectTitle = tx(locale, project.titleFr, project.titleEn);
    const amount = formatMoney(subscription.totalMinor, subscription.currencyCode, locale);
    return {
      id: subscription.id,
      searchValue: `${projectTitle} ${subscription.status} ${amount}`,
      filterValues: { status: subscription.status },
      sortValues: {
        project: projectTitle,
        status: subscription.status,
        amount: subscription.totalMinor,
      },
      cells: {
        project: projectTitle,
        status: subscription.status,
        amount,
      },
    };
  });

  return (
    <div className="space-y-6 px-4 md:px-0">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{tx(locale, "Actions confirmées", "Confirmed shares")}</h1>
        <p className="max-w-3xl text-sm text-muted">
          {tx(
            locale,
            "Seules les émissions approuvées apparaissent. Un paiement réussi n'y figure pas.",
            "Only approved issuances appear. A successful payment does not.",
          )}
        </p>
        <DataTable
          locale={locale}
          columns={holdingColumns}
          rows={holdingRows}
          emptyMessage={tx(locale, "Aucune action émise.", "No issued shares.")}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-bold">{tx(locale, "Pas encore émises", "Not yet issued")}</h2>
        <DataTable
          locale={locale}
          columns={pendingColumns}
          rows={pendingRows}
          emptyMessage={tx(locale, "Aucune souscription en attente d'émission.", "No subscriptions awaiting issuance.")}
        />
      </div>
    </div>
  );
}

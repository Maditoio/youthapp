import { redirect } from "next/navigation";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { formatDate, formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { investorSnapshot } from "@/server/view";

export const dynamic = "force-dynamic";

export default async function DividendsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const snap = investorSnapshot(session.db, session.user.id);
  const dividends = snap?.dividends ?? [];

  const columns: DataTableColumn[] = [
    { id: "issuer", header: tx(locale, "Émetteur", "Issuer"), sortable: true },
    { id: "record", header: tx(locale, "Date d'arrêté", "Record date"), sortable: true },
    { id: "paymentDate", header: tx(locale, "Paiement", "Payment"), sortable: true, hideOnMobile: true },
    { id: "gross", header: tx(locale, "Brut", "Gross"), align: "right", sortable: true },
    { id: "withholding", header: tx(locale, "Retenue", "Withholding"), align: "right", hideOnMobile: true },
    { id: "net", header: tx(locale, "Net", "Net"), align: "right", sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(dividends.map(({ payment }) => payment?.status ?? "—")),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
  ];

  const rows: DataTableRow[] = dividends.map(({ entitlement, declaration, payment, issuer }) => {
    const status = payment?.status ?? "—";
    const gross = formatMoney(entitlement.grossAmountMinor, declaration.currencyCode, locale);
    const withholding = formatMoney(entitlement.withholdingTaxMinor, declaration.currencyCode, locale);
    const net = formatMoney(entitlement.netAmountMinor, declaration.currencyCode, locale);
    return {
      id: entitlement.id,
      searchValue: `${issuer.legalName} ${gross} ${net} ${status} ${payment?.providerReference ?? ""}`,
      filterValues: { status },
      sortValues: {
        issuer: issuer.legalName,
        record: declaration.recordDate,
        paymentDate: declaration.paymentDate,
        gross: entitlement.grossAmountMinor,
        withholding: entitlement.withholdingTaxMinor,
        net: entitlement.netAmountMinor,
        status,
      },
      cells: {
        issuer: <span className="font-semibold">{issuer.legalName}</span>,
        record: formatDate(declaration.recordDate, locale),
        paymentDate: formatDate(declaration.paymentDate, locale),
        gross,
        withholding,
        net: (
          <span>
            {net}
            {payment?.providerReference ? (
              <span className="block text-xs text-muted">{payment.providerReference}</span>
            ) : null}
          </span>
        ),
        status,
      },
    };
  });

  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Dividendes", "Dividends")}</h1>
      <p className="max-w-3xl text-sm text-muted">
        {tx(
          locale,
          "Seuls les dividendes déclarés sont affichés. Aucun dividende futur n'est calculé.",
          "Only declared dividends are shown. No future dividend is calculated.",
        )}
      </p>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucun dividende.", "No dividends.")}
      />
    </div>
  );
}

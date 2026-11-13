import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { ledgerBalances } from "@/server/domain/finance";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const db = session.db;
  const balances = ledgerBalances(db);
  const unmatched = db.subscriptions.filter(
    (sub) =>
      sub.status === "PAID_AWAITING_CLOSING" &&
      !db.payments.some((payment) => payment.subscriptionId === sub.id && payment.status !== "FAILED"),
  );

  const balanceColumns: DataTableColumn[] = [
    { id: "currency", header: tx(locale, "Devise", "Currency"), sortable: true },
    { id: "debit", header: tx(locale, "Débit", "Debit"), align: "right", sortable: true },
    { id: "credit", header: tx(locale, "Crédit", "Credit"), align: "right", sortable: true },
    {
      id: "balance",
      header: tx(locale, "Équilibre", "Balance"),
      sortable: true,
      filter: {
        options: [
          { value: "OK", label: "OK" },
          { value: "OUT", label: tx(locale, "Déséquilibre", "Out of balance") },
        ],
        allLabel: tx(locale, "Tous", "All"),
      },
    },
  ];

  const balanceRows: DataTableRow[] = Object.entries(balances).map(([currency, totals]) => {
    const ok = totals.debit === totals.credit;
    const balance = ok ? "OK" : "OUT";
    return {
      id: currency,
      searchValue: `${currency} ${totals.debit} ${totals.credit} ${balance}`,
      filterValues: { balance },
      sortValues: {
        currency,
        debit: totals.debit,
        credit: totals.credit,
        balance,
      },
      cells: {
        currency: <span className="font-semibold">{currency}</span>,
        debit: totals.debit,
        credit: totals.credit,
        balance: ok ? "OK" : tx(locale, "DÉSÉQUILIBRE", "OUT OF BALANCE"),
      },
    };
  });

  const accountColumns: DataTableColumn[] = [
    { id: "code", header: tx(locale, "Code", "Code"), sortable: true },
    { id: "name", header: tx(locale, "Compte", "Account"), sortable: true },
    {
      id: "type",
      header: tx(locale, "Type", "Type"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(db.ledgerAccounts.map((item) => item.accountType)),
        allLabel: tx(locale, "Tous les types", "All types"),
      },
    },
    { id: "currency", header: tx(locale, "Devise", "Currency"), sortable: true },
  ];

  const accountRows: DataTableRow[] = db.ledgerAccounts.map((account) => ({
    id: account.id,
    searchValue: `${account.accountCode} ${account.accountName} ${account.accountType} ${account.currencyCode}`,
    filterValues: { type: account.accountType },
    sortValues: {
      code: account.accountCode,
      name: account.accountName,
      type: account.accountType,
      currency: account.currencyCode,
    },
    cells: {
      code: <span className="font-semibold">{account.accountCode}</span>,
      name: account.accountName,
      type: account.accountType,
      currency: account.currencyCode,
    },
  }));

  const unmatchedColumns: DataTableColumn[] = [
    { id: "reference", header: tx(locale, "Référence", "Reference"), sortable: true },
    { id: "investor", header: tx(locale, "Investisseur", "Investor"), sortable: true },
    { id: "status", header: tx(locale, "Statut", "Status"), sortable: true },
    { id: "amount", header: tx(locale, "Montant", "Amount"), align: "right", sortable: true },
  ];

  const unmatchedRows: DataTableRow[] = unmatched.map((sub) => {
    const profile = db.investorProfiles.find((item) => item.id === sub.investorProfileId);
    const investor = profile?.investorNumber ?? sub.investorProfileId;
    const amount = formatMoney(sub.totalMinor, sub.currencyCode, locale);
    return {
      id: sub.id,
      searchValue: `${sub.reference} ${investor} ${sub.status} ${amount}`,
      sortValues: {
        reference: sub.reference,
        investor,
        status: sub.status,
        amount: sub.totalMinor,
      },
      cells: {
        reference: <span className="font-semibold">{sub.reference}</span>,
        investor,
        status: sub.status,
        amount,
      },
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{tx(locale, "Rapprochement", "Reconciliation")}</h1>
        <p className="mt-1 text-sm text-muted">
          {tx(
            locale,
            "Le compte d'exploitation de la plateforme reste distinct de l'entiercement.",
            "Platform operating cash stays separate from escrow.",
          )}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{tx(locale, "Soldes par devise", "Balances by currency")}</h2>
        <DataTable
          locale={locale}
          columns={balanceColumns}
          rows={balanceRows}
          emptyMessage={tx(locale, "Aucun solde.", "No balances.")}
          pageSize={10}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{tx(locale, "Comptes du grand livre", "Ledger accounts")}</h2>
        <DataTable
          locale={locale}
          columns={accountColumns}
          rows={accountRows}
          emptyMessage={tx(locale, "Aucun compte.", "No accounts.")}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">
          {tx(locale, "Souscriptions payées sans paiement", "Paid subscriptions without a payment")}
        </h2>
        <DataTable
          locale={locale}
          columns={unmatchedColumns}
          rows={unmatchedRows}
          emptyMessage={tx(locale, "Aucune anomalie.", "No mismatches.")}
        />
      </section>
    </div>
  );
}

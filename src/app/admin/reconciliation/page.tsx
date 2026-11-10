import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { ledgerBalances } from "@/server/domain/finance";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const balances = ledgerBalances(session.db);
  const unmatched = session.db.subscriptions.filter(
    (sub) => sub.status === "PAID_AWAITING_CLOSING" && !session.db.payments.some((payment) => payment.subscriptionId === sub.id && payment.status !== "FAILED"),
  );
  return (
    <div className="space-y-3 text-sm">
      <h1 className="text-3xl font-bold">{tx(locale, "Rapprochement", "Reconciliation")}</h1>
      {Object.entries(balances).map(([currency, totals]) => (
        <p key={currency}>{currency}: {tx(locale, "débit", "debit")} {totals.debit} · {tx(locale, "crédit", "credit")} {totals.credit} · {totals.debit === totals.credit ? "OK" : tx(locale, "DÉSÉQUILIBRE", "OUT OF BALANCE")}</p>
      ))}
      <p>{tx(locale, "Souscriptions payées sans paiement", "Paid subscriptions without a payment")}: {unmatched.length}</p>
      <p>{tx(locale, "Le compte d'exploitation de la plateforme reste distinct de l'entiercement.", "Platform operating cash stays separate from escrow.")}</p>
      {session.db.ledgerAccounts.map((account) => (
        <p key={account.id}>{account.accountCode} · {account.accountName}</p>
      ))}
    </div>
  );
}

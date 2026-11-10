import { redirect } from "next/navigation";
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
  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Dividendes", "Dividends")}</h1>
      <p className="text-sm text-muted">{tx(locale, "Seuls les dividendes déclarés sont affichés. Aucun dividende futur n'est calculé.", "Only declared dividends are shown. No future dividend is calculated.")}</p>
      {snap?.dividends.map(({ entitlement, declaration, payment, issuer }) => (
        <article key={entitlement.id} className="rounded-[28px] bg-white p-5 text-sm">
          <p className="font-bold">{issuer.legalName}</p>
          <p>{tx(locale, "Date d'arrêté", "Record date")} {formatDate(declaration.recordDate, locale)} · {tx(locale, "paiement", "payment")} {formatDate(declaration.paymentDate, locale)}</p>
          <p>{tx(locale, "Brut", "Gross")} {formatMoney(entitlement.grossAmountMinor, declaration.currencyCode, locale)}</p>
          <p>{tx(locale, "Retenue", "Withholding")} {formatMoney(entitlement.withholdingTaxMinor, declaration.currencyCode, locale)}</p>
          <p>{tx(locale, "Net", "Net")} {formatMoney(entitlement.netAmountMinor, declaration.currencyCode, locale)} · {payment?.status} · {payment?.providerReference}</p>
        </article>
      ))}
    </div>
  );
}

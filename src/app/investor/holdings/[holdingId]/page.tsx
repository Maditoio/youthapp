import { notFound, redirect } from "next/navigation";
import { formatDate, formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { investorSnapshot } from "@/server/view";

export const dynamic = "force-dynamic";

export default async function HoldingDetail({ params }: { params: Promise<{ holdingId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const { holdingId } = await params;
  const snap = investorSnapshot(session.db, session.user.id);
  const holding = snap?.holdings.find((item) => item.shareClass.id === holdingId);
  if (!holding || !snap) notFound();
  const percent = holding.issued > 0 ? ((holding.quantity / holding.issued) * 100).toFixed(2) : "0";
  return (
    <div className="space-y-4 px-4 text-sm leading-6 md:px-0">
      <h1 className="text-3xl font-bold">{holding.issuer.legalName}</h1>
      <p>{holding.shareClass.className} · {holding.quantity} {tx(locale, "actions", "shares")}</p>
      <p>
        {tx(locale, "Pourcentage sur le registre de la plateforme", "Percentage on the platform register")}: {percent}% ({holding.quantity}/{holding.issued}) {tx(locale, "au", "as of")} {formatDate(session.db.clock, locale)}. {tx(locale, "Les fondateurs hors registre ne sont pas dans ce dénominateur.", "Founders outside the register are not in this denominator.")}
      </p>
      <p>{tx(locale, holding.shareClass.votingRightsFr, holding.shareClass.votingRightsEn)}</p>
      <p>{tx(locale, holding.shareClass.transferRestrictionsFr, holding.shareClass.transferRestrictionsEn)}</p>
      <h2 className="text-xl font-bold">{tx(locale, "Émissions", "Issuances")}</h2>
      {holding.issuances.map((item) => (
        <p key={item.id}>
          {item.allotmentDate} · {item.shareQuantity} · {formatMoney(item.issuePriceMinor, item.currencyCode, locale)} · {item.registerReference}
        </p>
      ))}
      <h2 className="text-xl font-bold">{tx(locale, "Dividendes de cette société", "Dividends from this company")}</h2>
      {snap.dividends
        .filter((item) => item.issuer.id === holding.issuer.id)
        .map(({ entitlement, declaration, payment }) => (
          <p key={entitlement.id}>
            {tx(locale, "Brut", "Gross")} {formatMoney(entitlement.grossAmountMinor, declaration.currencyCode, locale)} · {tx(locale, "retenue", "withholding")} {formatMoney(entitlement.withholdingTaxMinor, declaration.currencyCode, locale)} · {tx(locale, "net", "net")} {formatMoney(entitlement.netAmountMinor, declaration.currencyCode, locale)} · {payment?.status}
          </p>
        ))}
    </div>
  );
}

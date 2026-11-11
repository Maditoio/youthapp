import Link from "next/link";
import { redirect } from "next/navigation";
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
  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Actions confirmées", "Confirmed shares")}</h1>
      <p className="max-w-3xl text-sm text-muted">
        {tx(locale, "Seules les émissions approuvées apparaissent. Un paiement réussi n'y figure pas.", "Only approved issuances appear. A successful payment does not.")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {snap?.holdings.map((holding) => (
          <Link key={holding.shareClass.id} href={`/investor/holdings/${holding.shareClass.id}`} className="block rounded-[28px] bg-white p-5 transition-shadow hover:shadow-[var(--shadow-card)]">
            <p className="font-bold">{holding.issuer.legalName}</p>
            <p className="text-sm text-muted">{holding.shareClass.className}</p>
            <p className="mt-2 text-2xl font-bold">{holding.quantity}</p>
            <p className="text-xs text-muted">
              {tx(locale, "sur", "of")} {holding.issued} {tx(locale, "actions inscrites sur ce registre", "shares on this register")}
            </p>
          </Link>
        ))}
      </div>
      {snap?.holdings.length === 0 ? <p className="text-sm text-muted">{tx(locale, "Aucune action émise.", "No issued shares.")}</p> : null}
      <h2 className="pt-4 text-xl font-bold">{tx(locale, "Pas encore émises", "Not yet issued")}</h2>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {snap?.subscriptions
          .filter((item) => item.subscription.status === "PAID_AWAITING_CLOSING" || item.subscription.status === "PENDING_PAYMENT")
          .map(({ subscription, project }) => (
            <p key={subscription.id} className="rounded-2xl bg-white p-4 text-sm">
              {tx(locale, project.titleFr, project.titleEn)} · {subscription.status} · {formatMoney(subscription.totalMinor, subscription.currencyCode, locale)}
            </p>
          ))}
      </div>
    </div>
  );
}

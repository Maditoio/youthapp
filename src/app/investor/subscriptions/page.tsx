import Link from "next/link";
import { redirect } from "next/navigation";
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
  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Souscriptions", "Subscriptions")}</h1>
      {snap?.subscriptions.map(({ subscription, project }) => (
        <Link key={subscription.id} href={`/investor/subscriptions/${subscription.id}`} className="block rounded-[28px] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold">{tx(locale, project.titleFr, project.titleEn)}</p>
            <span className="text-xs font-semibold text-violet">{subscription.status}</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {subscription.shareQuantity} · {formatMoney(subscription.totalMinor, subscription.currencyCode, locale)} · {formatDate(subscription.createdAt, locale)}
          </p>
        </Link>
      ))}
    </div>
  );
}

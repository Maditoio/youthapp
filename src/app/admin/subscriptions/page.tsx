import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SubscriptionsAdmin() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold">{tx(locale, "Souscriptions", "Subscriptions")}</h1>
      {session.db.subscriptions.map((sub) => {
        const profile = session.db.investorProfiles.find((item) => item.id === sub.investorProfileId);
        return (
          <p key={sub.id} className="rounded-2xl bg-white p-3 text-sm">
            {sub.reference} · {profile?.investorNumber} · {sub.status} · {formatMoney(sub.totalMinor, sub.currencyCode, locale)} · {sub.shareQuantity}
          </p>
        );
      })}
    </div>
  );
}

import { AreaChart } from "@/components/visuals";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { activityFeed, investorSnapshot } from "@/server/view";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const snap = investorSnapshot(session.db, session.user.id);
  if (!snap) return null;
  const paid = snap.dividends.filter((item) => item.payment?.status === "PAID").reduce((sum, item) => sum + (item.payment?.amountMinor ?? 0), 0);
  const pending = snap.dividends.filter((item) => item.payment?.status === "PENDING").reduce((sum, item) => sum + (item.payment?.amountMinor ?? 0), 0);
  const feed = activityFeed(session.db, session.user.id);

  return (
    <div>
      <section className="rounded-b-[32px] bg-gradient-to-b from-[#cbbdff] via-[#8d74ff] to-[#6d4dff] px-5 pb-16 pt-8 text-white md:rounded-[28px] md:pb-8">
        <h1 className="text-center text-2xl font-bold">{tx(locale, "Statistiques", "Statistics")}</h1>
      </section>
      <div className="-mt-10 grid gap-4 px-4 md:mt-4 md:px-0 xl:grid-cols-3">
        <article className="rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] xl:col-span-2 xl:row-span-2">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="text-sm text-muted">{tx(locale, "Capital confirmé", "Confirmed capital")}</p>
              <p className="text-3xl font-bold">{formatMoney(snap.confirmedMinor, "USD", locale)}</p>
            </div>
            <span className="rounded-full bg-lilac px-3 py-1 text-xs font-semibold text-violet">
              {tx(locale, "Mois", "Month")}
            </span>
          </div>
          <div className="text-violet">
            <AreaChart values={snap.series} stroke="#6d4dff" fill="#e4dcff" dot="#6d4dff" />
          </div>
          <p className="text-xs text-muted">
            {tx(locale, "Chaque point est la somme des émissions déjà inscrites. Pas une valorisation.", "Each point is the sum of shares already issued. Not a valuation.")}
          </p>
        </article>
        <div className="grid grid-cols-2 content-start gap-3">
          <article className="rounded-[24px] bg-white p-4 shadow-sm">
            <p className="text-sm text-muted">{tx(locale, "Dividendes payés", "Dividends paid")}</p>
            <p className="mt-2 text-xl font-bold">{formatMoney(paid, "USD", locale)}</p>
          </article>
          <article className="rounded-[24px] bg-white p-4 shadow-sm">
            <p className="text-sm text-muted">{tx(locale, "Dividendes en attente", "Dividends pending")}</p>
            <p className="mt-2 text-xl font-bold">{formatMoney(pending, "USD", locale)}</p>
          </article>
        </div>
        <article className="rounded-[28px] bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-bold">{tx(locale, "Entrées et sorties", "In and out")}</h2>
          <ul className="divide-y divide-border">
            {feed.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 leading-snug">{tx(locale, item.titleFr, item.titleEn)}</span>
                <span className="shrink-0 font-semibold">{item.amount}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}

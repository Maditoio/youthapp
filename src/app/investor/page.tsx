import Link from "next/link";
import { Bell, FileText, ScanLine, Store, WalletCards } from "lucide-react";
import { DeskTop } from "@/components/investor-shell";
import { KycStatusCard } from "@/components/kyc-status-card";
import { AreaChart, StatusPill } from "@/components/visuals";
import { formatDate, formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { activityFeed, investorSnapshot, publicProjects } from "@/server/view";

export const dynamic = "force-dynamic";

export default async function InvestorHomePage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const snap = investorSnapshot(session.db, session.user.id);
  if (!snap) return null;
  const feed = activityFeed(session.db, session.user.id).slice(0, 4);
  const projects = publicProjects(session.db);
  const paid = snap.dividends
    .filter((item) => item.payment?.status === "PAID")
    .reduce((sum, item) => sum + (item.payment?.amountMinor ?? 0), 0);
  const pending = snap.dividends
    .filter((item) => item.payment?.status === "PENDING")
    .reduce((sum, item) => sum + (item.payment?.amountMinor ?? 0), 0);
  const monthLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov"];
  const unread = snap.notifications.filter((item) => item.status === "UNREAD").length;

  return (
    <div>
      <section className="bg-gradient-to-b from-surface-muted to-canvas px-4 pb-4 pt-5 md:hidden">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-lg font-bold text-white">
              {snap.user.legalFirstName.slice(0, 1)}
            </span>
            <div>
              <p className="text-lg font-bold text-ink">
                {tx(locale, "Bonjour", "Hi there")}, {snap.user.legalFirstName}
              </p>
              <p className="text-sm text-muted">{tx(locale, "Bienvenue sur Jeunese", "Welcome back to Jeunese")}</p>
            </div>
          </div>
          <Link href="/investor/notifications" className="relative grid h-11 w-11 place-items-center rounded-full bg-white text-ink shadow-sm" aria-label={tx(locale, "Notifications", "Notifications")}>
            <Bell className="h-5 w-5" />
            {unread > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-pink" /> : null}
          </Link>
        </div>
        <div className="rounded-[28px] border border-border bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm text-muted">{tx(locale, "Capital confirmé", "Confirmed capital")}</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-ink">{formatMoney(snap.confirmedMinor, "USD", locale)}</p>
          <p className="mt-3 text-sm text-muted">
            {snap.shareCount} {tx(locale, "actions dans", "shares in")} {snap.issuerCount}{" "}
            {tx(locale, "émetteur", "issuer")}
          </p>
          <p className="mt-2 text-xs text-muted">
            {tx(locale, "Somme des souscriptions allouées. Ce n'est pas une valeur de revente.", "Sum of allotted subscriptions. This is not a resale value.")}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-violet to-gold" />
          </div>
        </div>
      </section>

      <div className="px-4 md:px-0">
        <DeskTop
          title={tx(locale, "Tableau de bord", "Dashboard")}
          name={snap.user.legalFirstName}
          action={
            <Link href="/investor/notifications" className="relative grid h-11 w-11 place-items-center rounded-full bg-white text-ink">
              <Bell className="h-5 w-5" />
            </Link>
          }
        />

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.7fr)]">
          <article className="hidden rounded-[28px] border border-border bg-white p-6 shadow-[var(--shadow-card)] md:block">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">{tx(locale, "Vue d'ensemble", "Overview")}</h2>
              <StatusPill tone="gold">{tx(locale, "Capital alloué", "Allotted capital")}</StatusPill>
            </div>
            <div className="text-violet">
              <AreaChart
                values={snap.series}
                labels={["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov"]}
                stroke="#6d4dff"
                fill="rgba(109,77,255,0.12)"
                dot="#f6c15b"
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Metric label={tx(locale, "Confirmé", "Confirmed")} value={formatMoney(snap.confirmedMinor, "USD", locale)} ink />
              <Metric label={tx(locale, "Actions", "Shares")} value={String(snap.shareCount)} ink />
              <Metric label={tx(locale, "Émetteurs", "Issuers")} value={String(snap.issuerCount)} ink />
            </div>
          </article>
          <div className="hidden gap-4 md:grid">
            <article className="rounded-[28px] border border-border bg-white p-5">
              <p className="text-sm text-muted">{tx(locale, "Dividendes payés", "Dividends paid")}</p>
              <p className="mt-2 text-3xl font-bold text-ink">{formatMoney(paid, "USD", locale)}</p>
              <span className="mt-3 inline-block h-1 w-12 rounded-full bg-pink" />
            </article>
            <article className="rounded-[28px] border border-border bg-white p-5">
              <p className="text-sm text-muted">{tx(locale, "Dividendes en attente", "Dividends pending")}</p>
              <p className="mt-2 text-3xl font-bold text-ink">{formatMoney(pending, "USD", locale)}</p>
              <span className="mt-3 inline-block h-1 w-12 rounded-full bg-gold" />
            </article>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 md:hidden">
          {[
            { href: "/projects", icon: Store, label: tx(locale, "Projets", "Projects") },
            { href: "/investor/offers", icon: WalletCards, label: tx(locale, "Offres", "Offers") },
            { href: "/investor/documents", icon: FileText, label: tx(locale, "Docs", "Docs") },
            { href: "/investor/votes", icon: ScanLine, label: tx(locale, "Votes", "Votes") },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-2 text-xs font-semibold text-ink">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-violet shadow-sm">
                <item.icon className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <section className="rounded-[28px] bg-white p-4 shadow-sm md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">{tx(locale, "Activité récente", "Recent activity")}</h2>
                <Link href="/investor/subscriptions" className="text-sm font-semibold text-violet">
                  {tx(locale, "Tout", "All")}
                </Link>
              </div>
              <ul className="divide-y divide-border">
                {feed.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">{tx(locale, item.titleFr, item.titleEn)}</p>
                      <p className="text-xs text-muted">{formatDate(item.at, locale)}</p>
                    </div>
                    <span className={`shrink-0 text-right font-bold ${item.positive ? "text-emerald-600" : "text-ink"}`}>{item.amount}</span>
                  </li>
                ))}
                {feed.length === 0 ? <li className="py-6 text-sm text-muted">{tx(locale, "Aucune activité confirmée.", "No confirmed activity yet.")}</li> : null}
              </ul>
            </section>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {projects.map(({ project, progress, offering }) => (
                <Link key={project.id} href={`/projects/${project.slug}`} className="rounded-[28px] bg-white p-4 shadow-sm">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lilac text-violet">
                    <Store className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 font-bold">{tx(locale, project.titleFr, project.titleEn)}</h3>
                  <p className="mt-1 text-sm text-muted">{project.locationName}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-lilac">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, ((progress?.confirmedMinor ?? 0) / (offering?.maximumRaiseMinor || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {tx(locale, "Paiements confirmés", "Confirmed payments")}{" "}
                    {formatMoney(progress?.confirmedMinor ?? 0, offering?.currencyCode ?? "USD", locale)}
                  </p>
                </Link>
              ))}
              {snap.profile.onboardingStatus !== "APPROVED" ? (
                <KycStatusCard
                  locale={locale}
                  status={snap.profile.onboardingStatus}
                  kyc={session.db.kycCases.find((item) => item.investorProfileId === snap.profile.id)}
                  compact
                />
              ) : null}
              <article className="rounded-[28px] bg-white p-4 shadow-sm">
                <h3 className="font-bold">{tx(locale, "Votes ouverts", "Open votes")}</h3>
                <p className="mt-2 text-sm text-muted">
                  {session.db.resolutions.filter((item) => item.status === "OPEN").length}
                </p>
                <Link href="/investor/votes" className="mt-4 inline-block text-sm font-semibold text-violet">
                  {tx(locale, "Voir", "View")}
                </Link>
              </article>
            </div>
          </div>
          <aside className="rounded-[28px] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">{tx(locale, "Actualités", "Updates")}</h2>
              <Link href="/projects" className="text-sm font-semibold text-violet">
                {tx(locale, "Tout", "All")}
              </Link>
            </div>
            <ul className="space-y-3">
              {session.db.projectUpdates
                .filter((item) => item.approvalStatus === "APPROVED")
                .map((item) => (
                  <li key={item.id} className="rounded-2xl bg-lilac/60 p-3">
                    <p className="font-semibold">{tx(locale, item.titleFr, item.titleEn)}</p>
                    <p className="mt-1 text-sm text-muted">{tx(locale, item.bodyFr, item.bodyEn)}</p>
                  </li>
                ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              {monthLabels[10]} · {tx(locale, "Données de démonstration", "Demonstration data")}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, ink = false }: { label: string; value: string; ink?: boolean }) {
  return (
    <div className={ink ? "rounded-2xl bg-surface-muted p-3" : "rounded-2xl bg-white/15 p-3"}>
      <p className={ink ? "text-xs text-muted" : "text-xs text-white/75"}>{label}</p>
      <p className={ink ? "mt-1 text-lg font-bold text-ink" : "mt-1 text-lg font-bold"}>{value}</p>
    </div>
  );
}

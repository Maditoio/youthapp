import { redirect } from "next/navigation";
import { SidebarShell, type NavGroup, type NavItem } from "@/components/side-nav";
import { SidebarFooter } from "@/components/sidebar-footer";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { isInvestorOnboardingComplete } from "@/server/domain/mutate";

export const dynamic = "force-dynamic";

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!session.roles.includes("investor")) {
    redirect(session.roles.includes("issuer_manager") ? "/issuer" : "/admin");
  }

  const { headers } = await import("next/headers");
  const pathname = (await headers()).get("x-pathname") ?? "";
  const onOnboarding = pathname.includes("/investor/onboarding");
  if (!onOnboarding && !isInvestorOnboardingComplete(session.db, session.user.id)) {
    redirect("/investor/onboarding");
  }

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = (fr: string, en: string) => tx(locale, fr, en);
  const unread = session.db.notifications.filter(
    (item) => item.userId === session.user.id && item.status === "UNREAD",
  ).length;

  const dashboard: NavItem = { href: "/investor", label: dict.nav.dashboard, icon: "home", exact: true };
  const statistics: NavItem = { href: "/investor/statistics", label: t("Statistiques", "Statistics"), icon: "bar" };
  const offers: NavItem = { href: "/investor/offers", label: t("Offres", "Offers"), icon: "tag" };
  const portfolio: NavItem = { href: "/investor/holdings", label: dict.nav.portfolio, icon: "pie" };

  const groups: NavGroup[] = [
    { label: t("Aperçu", "Overview"), items: [dashboard, statistics] },
    {
      label: t("Investir", "Investing"),
      items: [
        offers,
        { href: "/projects", label: dict.nav.projects, icon: "store" },
        portfolio,
        { href: "/investor/subscriptions", label: t("Souscriptions", "Subscriptions"), icon: "contract" },
        { href: "/investor/dividends", label: t("Dividendes", "Dividends"), icon: "coins" },
      ],
    },
    {
      label: t("Gouvernance", "Governance"),
      items: [{ href: "/investor/votes", label: t("Votes", "Votes"), icon: "vote" }],
    },
    {
      label: t("Compte", "Account"),
      items: [
        { href: "/investor/profile", label: dict.nav.profile, icon: "user" },
        { href: "/investor/documents", label: t("Documents", "Documents"), icon: "file" },
        { href: "/investor/notifications", label: t("Notifications", "Notifications"), icon: "bell", badge: unread },
        { href: "/investor/support", label: t("Assistance", "Support"), icon: "support" },
      ],
    },
  ];

  return (
    <SidebarShell
      homeHref="/investor"
      area={t("Investisseur", "Investor")}
      userName={session.user.legalFirstName}
      userMeta={session.user.email}
      groups={groups}
      mobileTabs={[dashboard, statistics, offers, portfolio]}
      footer={<SidebarFooter locale={locale} returnTo="/investor" />}
      labels={{
        nav: t("Navigation investisseur", "Investor navigation"),
        menu: t("Ouvrir le menu", "Open menu"),
        close: t("Fermer le menu", "Close menu"),
        more: t("Plus", "More"),
      }}
      mainClassName="min-h-0 pb-32 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pb-10 lg:pt-8"
    >
      {children}
    </SidebarShell>
  );
}

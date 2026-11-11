import { redirect } from "next/navigation";
import { SidebarShell, type NavGroup } from "@/components/side-nav";
import { SidebarFooter } from "@/components/sidebar-footer";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const staff = session.roles.some((role) => role !== "investor" && role !== "issuer_manager");
  if (!staff) redirect(session.roles.includes("issuer_manager") ? "/issuer" : "/investor");
  const locale = await getLocale();
  const t = (fr: string, en: string) => tx(locale, fr, en);

  const groups: NavGroup[] = [
    {
      label: t("Aperçu", "Overview"),
      items: [{ href: "/admin", label: t("Tableau de bord", "Dashboard"), icon: "dashboard", exact: true }],
    },
    {
      label: t("Investisseurs et conformité", "Investors & compliance"),
      items: [
        { href: "/admin/investors", label: t("Investisseurs", "Investors"), icon: "users" },
        { href: "/admin/kyc", label: t("Identité (KYC)", "Identity (KYC)"), icon: "identity" },
        { href: "/admin/inheritance", label: t("Successions", "Estates"), icon: "scroll" },
      ],
    },
    {
      label: t("Marchés de capitaux", "Capital markets"),
      items: [
        { href: "/admin/issuers", label: t("Émetteurs", "Issuers"), icon: "building" },
        { href: "/admin/projects", label: t("Projets", "Projects"), icon: "folder" },
        { href: "/admin/offerings", label: t("Offres", "Offerings"), icon: "tag" },
        { href: "/admin/subscriptions", label: t("Souscriptions", "Subscriptions"), icon: "contract" },
      ],
    },
    {
      label: t("Trésorerie", "Money"),
      items: [
        { href: "/admin/payments", label: t("Paiements", "Payments"), icon: "card" },
        { href: "/admin/reconciliation", label: t("Rapprochement", "Reconciliation"), icon: "scale" },
        { href: "/admin/dividends", label: t("Dividendes", "Dividends"), icon: "coins" },
      ],
    },
    {
      label: t("Actionnaires", "Shareholders"),
      items: [
        { href: "/admin/share-register", label: t("Registre", "Register"), icon: "book" },
        { href: "/admin/votes", label: t("Votes", "Votes"), icon: "vote" },
      ],
    },
    {
      label: t("Plateforme", "Platform"),
      items: [
        { href: "/admin/content", label: t("Contenu", "Content"), icon: "news" },
        { href: "/admin/support", label: t("Support", "Support"), icon: "support" },
        { href: "/admin/staff", label: t("Personnel", "Staff"), icon: "staff" },
        { href: "/admin/audit-logs", label: t("Audit", "Audit"), icon: "clipboard" },
        { href: "/admin/reports", label: t("Rapports", "Reports"), icon: "chart" },
        { href: "/admin/settings", label: t("Réglages", "Settings"), icon: "settings" },
      ],
    },
  ];

  return (
    <SidebarShell
      homeHref="/admin"
      area={t("Admin", "Admin")}
      userName={session.user.legalFirstName}
      userMeta={session.user.email}
      groups={groups}
      footer={<SidebarFooter locale={locale} settingsHref="/admin/settings" />}
      labels={{
        nav: t("Navigation administration", "Admin navigation"),
        menu: t("Ouvrir le menu", "Open menu"),
        close: t("Fermer le menu", "Close menu"),
        more: t("Plus", "More"),
      }}
      mainClassName="px-4 py-5 md:px-6 lg:px-8 lg:py-8"
    >
      {children}
    </SidebarShell>
  );
}

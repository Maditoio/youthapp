import { redirect } from "next/navigation";
import { SidebarShell, type NavGroup } from "@/components/side-nav";
import { SidebarFooter } from "@/components/sidebar-footer";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function IssuerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!session.roles.includes("issuer_manager")) redirect("/admin");
  const locale = await getLocale();
  const t = (fr: string, en: string) => tx(locale, fr, en);

  const groups: NavGroup[] = [
    {
      label: t("Société", "Company"),
      items: [
        { href: "/issuer", label: t("Société", "Company"), icon: "building", exact: true },
        { href: "/issuer/projects", label: t("Projets", "Projects"), icon: "folder" },
      ],
    },
    {
      label: t("Résultats", "Performance"),
      items: [
        { href: "/issuer/profits", label: t("Bénéfices", "Profits"), icon: "coins" },
        { href: "/issuer/reports", label: t("Rapports", "Reports"), icon: "chart" },
      ],
    },
    {
      label: t("Communication", "Communication"),
      items: [
        { href: "/issuer/updates", label: t("Actualités", "Updates"), icon: "news" },
        { href: "/issuer/shareholder-communications", label: t("Actionnaires", "Shareholders"), icon: "megaphone" },
        { href: "/issuer/documents", label: t("Documents", "Documents"), icon: "file" },
      ],
    },
    {
      label: t("Compte", "Account"),
      items: [{ href: "/issuer/settings", label: t("Réglages", "Settings"), icon: "settings" }],
    },
  ];

  return (
    <SidebarShell
      homeHref="/issuer"
      area={t("Émetteur", "Issuer")}
      userName={session.user.legalFirstName}
      userMeta={session.user.email}
      groups={groups}
      footer={<SidebarFooter locale={locale} shell="issuer" />}
      labels={{
        nav: t("Navigation émetteur", "Issuer navigation"),
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

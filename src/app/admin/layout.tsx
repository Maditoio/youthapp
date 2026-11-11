import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

const links = [
  ["/admin", "Tableau", "Dashboard"],
  ["/admin/investors", "Investisseurs", "Investors"],
  ["/admin/kyc", "Identité", "Identity"],
  ["/admin/inheritance", "Successions", "Estates"],
  ["/admin/issuers", "Émetteurs", "Issuers"],
  ["/admin/projects", "Projets", "Projects"],
  ["/admin/offerings", "Offres", "Offerings"],
  ["/admin/subscriptions", "Souscriptions", "Subscriptions"],
  ["/admin/payments", "Paiements", "Payments"],
  ["/admin/reconciliation", "Rapprochement", "Reconciliation"],
  ["/admin/share-register", "Registre", "Register"],
  ["/admin/dividends", "Dividendes", "Dividends"],
  ["/admin/votes", "Votes", "Votes"],
  ["/admin/content", "Contenu", "Content"],
  ["/admin/support", "Support", "Support"],
  ["/admin/staff", "Personnel", "Staff"],
  ["/admin/audit-logs", "Audit", "Audit"],
  ["/admin/reports", "Rapports", "Reports"],
  ["/admin/settings", "Réglages", "Settings"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const staff = session.roles.some((role) => role !== "investor" && role !== "issuer_manager");
  if (!staff) redirect(session.roles.includes("issuer_manager") ? "/issuer" : "/investor");
  const locale = await getLocale();
  return (
    <div className="min-h-dvh bg-canvas md:flex">
      <aside className="w-full shrink-0 bg-violet text-white md:min-h-dvh md:w-64">
        <div className="px-4 py-5">
          <Link href="/admin" className="text-lg font-extrabold tracking-wide">JEUNESE</Link>
          <p className="text-xs text-white/70">{session.user.legalFirstName}</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:block md:space-y-1 md:px-3">
          {links.map(([href, fr, en]) => (
            <Link key={href} href={href} className="block whitespace-nowrap rounded-2xl px-3 py-2 text-sm hover:bg-white/15">
              {tx(locale, fr, en)}
            </Link>
          ))}
        </nav>
        <div className="px-4 pb-4">
          <SignOutButton className="text-sm text-white/80">{tx(locale, "Sortir", "Sign out")}</SignOutButton>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-end px-4 py-3">
          <LanguageSwitcher locale={locale} labels={{ language: "Language", french: "FR", english: "EN" }} returnTo="/admin" />
        </header>
        <main className="px-4 pb-10 md:px-8">{children}</main>
      </div>
    </div>
  );
}

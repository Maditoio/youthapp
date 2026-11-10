import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { signOutAction } from "@/server/actions";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function IssuerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!session.roles.includes("issuer_manager")) redirect("/admin");
  const locale = await getLocale();
  const links = [
    ["/issuer", tx(locale, "Société", "Company")],
    ["/issuer/projects", tx(locale, "Projets", "Projects")],
    ["/issuer/profits", tx(locale, "Bénéfices", "Profits")],
    ["/issuer/updates", tx(locale, "Actualités", "Updates")],
    ["/issuer/reports", tx(locale, "Rapports", "Reports")],
    ["/issuer/documents", tx(locale, "Documents", "Documents")],
    ["/issuer/shareholder-communications", tx(locale, "Actionnaires", "Shareholders")],
  ];
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex items-center justify-between bg-violet px-4 py-4 text-white">
        <Link href="/issuer" className="font-extrabold">JEUNESE</Link>
        <nav className="hidden gap-4 text-sm md:flex">
          {links.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher locale={locale} labels={{ language: "Language", french: "FR", english: "EN" }} returnTo="/issuer" />
          <form action={signOutAction}><button className="text-sm">{tx(locale, "Sortir", "Sign out")}</button></form>
        </div>
      </header>
      <nav className="flex gap-3 overflow-x-auto bg-violet px-4 pb-3 text-sm text-white md:hidden">
        {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}

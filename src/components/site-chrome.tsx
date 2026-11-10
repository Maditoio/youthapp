import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/visuals";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export async function SiteHeader({ returnTo }: { returnTo: string }) {
  const locale = await getLocale();
  const session = await getSession();
  const href = session
    ? session.roles.includes("investor")
      ? "/investor"
      : session.roles.includes("issuer_manager")
        ? "/issuer"
        : "/admin"
    : "/sign-in";
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
      <Link href="/" aria-label="Jeunese">
        <Logo />
      </Link>
      <nav className="hidden items-center gap-5 text-sm font-semibold text-muted md:flex">
        <Link href="/projects">{tx(locale, "Projets", "Projects")}</Link>
        <Link href="/how-it-works">{tx(locale, "Comment ça marche", "How it works")}</Link>
        <Link href="/learn">{tx(locale, "Apprendre", "Learn")}</Link>
        <Link href="/risks">{tx(locale, "Risques", "Risks")}</Link>
      </nav>
      <div className="flex items-center gap-2">
        <LanguageSwitcher
          locale={locale}
          labels={{ language: tx(locale, "Langue", "Language"), french: "FR", english: "EN" }}
          returnTo={returnTo}
        />
        <Link href={href} className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white">
          {session ? tx(locale, "Mon espace", "My space") : tx(locale, "Connexion", "Sign in")}
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: "fr" | "en" }) {
  return (
    <footer className="mx-auto mt-16 max-w-6xl px-4 pb-16 text-sm text-muted">
      <p className="font-bold text-ink">Jeunese</p>
      <p className="mt-1">{tx(locale, "Construit par le Congo. Possédé par les Congolais.", "Built by Congo. Owned by Congolese.")}</p>
      <p className="mt-3 max-w-3xl">
        {tx(
          locale,
          "Entité légale non constituée dans cette démonstration. Aucun agrément, aucune licence et aucune protection d'investisseur ne sont revendiqués. Ceci n'est pas une offre réelle.",
          "No legal entity is formed in this demonstration. No authorisation, licence or investor protection is claimed. This is not a real offer.",
        )}
      </p>
      <div className="mt-4 flex flex-wrap gap-4 font-semibold">
        <Link href="/legal">{tx(locale, "Mentions", "Legal")}</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/contact">{tx(locale, "Contact", "Contact")}</Link>
        <Link href="/about">{tx(locale, "À propos", "About")}</Link>
      </div>
    </footer>
  );
}

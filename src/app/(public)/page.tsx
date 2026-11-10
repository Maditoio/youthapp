import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { AreaChart, Logo, OwnershipArt } from "@/components/visuals";
import { formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getStore } from "@/server/db/store";
import { publicProjects } from "@/server/view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = await getLocale();
  const db = getStore().db;
  const featured = publicProjects(db)[0];
  const progress = featured?.progress;
  const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];
  const series = months.map((month) =>
    db.payments
      .filter((payment) => payment.confirmedAt && payment.confirmedAt <= `${month}-31T23:59:59.000Z` && payment.status !== "REFUNDED")
      .reduce((sum, payment) => sum + payment.amountMinor, 0),
  );

  return (
    <div>
      <section className="mx-auto min-h-[100dvh] max-w-[430px] md:hidden">
        <div className="relative overflow-hidden rounded-b-[40px] bg-gradient-to-b from-[#d5c9ff] via-[#8f78ff] to-[#6d4dff] px-6 pb-16 pt-6 text-white">
          <div className="flex items-center justify-between">
            <Logo light />
            <LanguageSwitcher
              locale={locale}
              labels={{ language: "Langue", french: "FR", english: "EN" }}
              returnTo="/"
            />
          </div>
          <OwnershipArt />
          <div className="mt-2 flex justify-center gap-2" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-white/50" />
            <span className="h-2 w-2 rounded-full bg-white/50" />
            <span className="h-2 w-6 rounded-full bg-white" />
          </div>
        </div>
        <div className="-mt-8 rounded-t-[36px] bg-white px-6 pb-10 pt-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-3xl font-bold leading-tight text-ink">
            {tx(locale, "L'avenir de la propriété partagée est ici", "The future of shared ownership is here")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {tx(
              locale,
              "Devenir actionnaire d'une entreprise congolaise peut être clair. Commencez, lisez les risques, puis voyez la différence.",
              "Becoming a shareholder in a Congolese business can be clear. Start, read the risks, then see the difference.",
            )}
          </p>
          <Link href="/sign-up" className="mt-6 inline-flex">
            <Button size="lg" className="min-w-48">
              {tx(locale, "Commencer", "Get started")}
            </Button>
          </Link>
        </div>
      </section>

      <div className="hidden md:block">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <Logo />
          <nav className="flex items-center gap-6 text-sm font-semibold text-muted">
            <Link href="/projects">{tx(locale, "Projets", "Projects")}</Link>
            <Link href="/how-it-works">{tx(locale, "Comment ça marche", "How it works")}</Link>
            <Link href="/learn">{tx(locale, "Apprendre", "Learn")}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher locale={locale} labels={{ language: "Language", french: "FR", english: "EN" }} returnTo="/" />
            <Link href="/sign-in" className="rounded-full px-4 py-2 text-sm font-semibold">
              {tx(locale, "Connexion", "Sign in")}
            </Link>
            <Link href="/sign-up" className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white">
              {tx(locale, "Créer un compte", "Create account")}
            </Link>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet">Jeunese</p>
            <h1 className="mt-3 text-5xl font-bold leading-tight text-ink">
              {tx(locale, "Investir ensemble. Construire ensemble. Posséder ensemble.", "Invest together. Build together. Own together.")}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              {tx(
                locale,
                "Une plateforme pour devenir actionnaire d'entreprises productives en RDC. Les actions d'une société ne donnent aucun droit sur les autres.",
                "A platform for becoming a shareholder in productive businesses in the DRC. Shares in one company give no right in the others.",
              )}
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/projects">
                <Button size="lg">{tx(locale, "Explorer les projets", "Explore projects")}</Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="secondary">
                  {tx(locale, "Comment fonctionne la propriété", "How ownership works")}
                </Button>
              </Link>
            </div>
          </div>
          <div className="rounded-[32px] bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="rounded-[28px] bg-gradient-to-br from-[#6d4dff] to-[#8a74ff] p-5 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{tx(locale, "Offre de démonstration", "Demonstration offering")}</h2>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs">{tx(locale, "Paiements confirmés", "Confirmed payments")}</span>
              </div>
              <p className="mt-3 text-3xl font-bold">
                {featured?.offering ? formatMoney(progress?.confirmedMinor ?? 0, featured.offering.currencyCode, locale) : "—"}
              </p>
              <AreaChart values={series} />
              <p className="text-xs text-white/75">
                {tx(
                  locale,
                  "Montant des paiements confirmés sur l'offre publiée. Les souscriptions seulement initiées ne sont pas incluses.",
                  "Confirmed payments on the published offering. Merely initiated subscriptions are excluded.",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
        {[
          [tx(locale, "1. Créer un compte", "1. Create an account"), tx(locale, "E-mail vérifié, pays et téléphone. Ce n'est pas encore une identité approuvée.", "Verified email, country and phone. That is not yet an approved identity.")],
          [tx(locale, "2. Lire l'offre", "2. Read the offer"), tx(locale, "Documents, prix, risques et limites avant toute souscription.", "Documents, price, risks and limits before any subscription.")],
          [tx(locale, "3. Devenir actionnaire", "3. Become a shareholder"), tx(locale, "Le paiement ne suffit pas. Les actions viennent d'une émission approuvée.", "Payment is not enough. Shares come from an approved issuance.")],
        ].map(([title, body]) => (
          <article key={title} className="rounded-[28px] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </article>
        ))}
      </section>
      <SiteFooter locale={locale} />
    </div>
  );
}

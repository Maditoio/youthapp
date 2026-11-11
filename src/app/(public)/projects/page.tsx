import Form from "next/form";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { StatusPill } from "@/components/visuals";
import { formatDate, formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getStore } from "@/server/db/store";
import { INDUSTRIES } from "@/lib/choices";
import { publicProjects } from "@/server/view";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; industry?: string }>;
}) {
  const locale = await getLocale();
  const params = await searchParams;
  const q = (params.q ?? "").toLowerCase();
  const projects = publicProjects((await getStore()).db).filter((item) => {
    const title = `${item.project.titleFr} ${item.project.titleEn} ${item.project.industry}`.toLowerCase();
    const industryOk = !params.industry || item.project.industry === params.industry;
    return industryOk && (!q || title.includes(q));
  });
  return (
    <div>
      <SiteHeader returnTo="/projects" />
      <main className="mx-auto max-w-6xl px-4">
        <h1 className="text-3xl font-bold">{tx(locale, "Projets publiés", "Published projects")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {tx(locale, "Seules les offres ouvertes et approuvées sont listées. Les brouillons restent invisibles.", "Only open, approved offerings are listed. Drafts stay hidden.")}
        </p>
        <Form action="/projects" className="mt-4 flex flex-wrap gap-2">
          <input name="q" defaultValue={params.q ?? ""} placeholder={tx(locale, "Rechercher", "Search")} className="h-12 flex-1 rounded-full border border-border bg-white px-4" />
          <select name="industry" defaultValue={params.industry ?? ""} className="h-12 rounded-full border border-border bg-white px-4">
            <option value="">{tx(locale, "Tous les secteurs", "All industries")}</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry.code} value={industry.code}>{tx(locale, industry.fr, industry.en)}</option>
            ))}
          </select>
          <SubmitButton size="lg">{tx(locale, "Filtrer", "Filter")}</SubmitButton>
        </Form>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {projects.map(({ project, issuer, offering, progress, terms }) => (
            <article key={project.id} className="rounded-[28px] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <StatusPill>{offering?.status}</StatusPill>
                <span className="text-xs text-muted">{project.locationName}</span>
              </div>
              <h2 className="mt-3 text-xl font-bold">{tx(locale, project.titleFr, project.titleEn)}</h2>
              <p className="text-sm text-muted">{issuer.legalName}</p>
              <p className="mt-2 text-sm">{tx(locale, project.shortFr, project.shortEn)}</p>
              <div className="mt-4 h-2 rounded-full bg-lilac">
                <div className="h-full rounded-full bg-violet" style={{ width: `${Math.min(100, ((progress?.confirmedMinor ?? 0) / (offering?.maximumRaiseMinor || 1)) * 100)}%` }} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted">{tx(locale, "Paiements confirmés", "Confirmed payments")}</dt>
                  <dd className="font-semibold">{formatMoney(progress?.confirmedMinor ?? 0, offering?.currencyCode ?? "USD", locale)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{tx(locale, "Minimum", "Minimum")}</dt>
                  <dd className="font-semibold">{formatMoney(offering?.minimumSubscriptionMinor ?? 0, offering?.currencyCode ?? "USD", locale)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{tx(locale, "Prix d'émission", "Issue price")}</dt>
                  <dd className="font-semibold">{formatMoney(terms?.issuePriceMinor ?? 0, offering?.currencyCode ?? "USD", locale)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{tx(locale, "Clôture", "Closes")}</dt>
                  <dd className="font-semibold">{offering ? formatDate(offering.closesAt, locale) : "—"}</dd>
                </div>
              </dl>
              <Link href={`/projects/${project.slug}`} className="mt-4 inline-flex rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white">
                {tx(locale, "Voir le projet", "View project")}
              </Link>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

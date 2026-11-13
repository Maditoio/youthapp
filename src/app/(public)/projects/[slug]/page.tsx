import Link from "next/link";
import { notFound } from "next/navigation";
import { OfferingCountdown } from "@/components/offering-countdown";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { StatusPill } from "@/components/visuals";
import { formatDate, formatMoney } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getStore } from "@/server/db/store";
import { fundingProgress } from "@/server/domain/finance";
import { interestDemand } from "@/server/domain/mutate";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await getLocale();
  const { slug } = await params;
  const db = (await getStore()).db;
  const project = db.projects.find((item) => item.slug === slug && item.status === "PUBLISHED");
  if (!project) notFound();
  const issuer = db.issuers.find((item) => item.id === project.issuerId)!;
  const offering = db.offerings.find((item) => item.projectId === project.id)!;
  const terms = db.offeringShareTerms.find((item) => item.offeringId === offering.id)!;
  const shareClass = db.shareClasses.find((item) => item.id === terms.shareClassId)!;
  const docs = db.offeringDocuments.filter((item) => item.offeringId === offering.id && item.visibility === "PUBLIC");
  const progress = fundingProgress(db, offering.id);
  const demand = interestDemand(db, offering.id);
  const updates = db.projectUpdates.filter((item) => item.projectId === project.id && item.approvalStatus === "APPROVED");
  const t = (fr: string, en: string) => tx(locale, fr, en);
  const upcoming =
    offering.status === "SCHEDULED" ||
    offering.status === "APPROVED" ||
    (offering.status === "OPEN" && Date.parse(offering.opensAt) > Date.now());
  const ctaHref = `/investor/offers/${offering.id}`;
  const ctaLabel = upcoming
    ? t("Manifester un intérêt", "Express interest")
    : t("Voir la souscription", "View subscription");

  return (
    <div>
      <SiteHeader returnTo={`/projects/${slug}`} />
      <main className="mx-auto max-w-3xl space-y-4 px-4">
        <StatusPill>{offering.status}</StatusPill>
        <h1 className="text-4xl font-bold">{t(project.titleFr, project.titleEn)}</h1>
        <p className="text-muted">{issuer.legalName} · {issuer.registrationNumber} · {issuer.legalForm}</p>
        <p>{t(project.fullFr, project.fullEn)}</p>
        <section className="rounded-[28px] bg-white p-5">
          <h2 className="text-xl font-bold">{t("Marché et lieu", "Market and location")}</h2>
          <p className="mt-2">{t(project.marketFr, project.marketEn)}</p>
          <p className="mt-2 text-sm text-muted">{project.locationName} · {project.industry}</p>
        </section>
        <section className="rounded-[28px] bg-white p-5">
          <h2 className="text-xl font-bold">{t("Équipe", "Team")}</h2>
          {project.team.map((member) => (
            <p key={member.name} className="mt-2">
              <strong>{member.name}</strong> — {t(member.roleFr, member.roleEn)}. {t(member.experienceFr, member.experienceEn)}
            </p>
          ))}
        </section>
        <section className="rounded-[28px] bg-white p-5">
          <h2 className="text-xl font-bold">{t("Emploi des fonds", "Use of proceeds")}</h2>
          <ul className="mt-2 space-y-1">
            {project.useOfProceeds.map((line) => (
              <li key={line.labelEn} className="flex justify-between text-sm">
                <span>{t(line.labelFr, line.labelEn)}</span>
                <span>{formatMoney(line.amountMinor, offering.currencyCode, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
        {upcoming ? (
          <section className="space-y-3 rounded-[28px] bg-white p-5">
            <h2 className="text-xl font-bold">{t("Bientôt ouvert", "Opening soon")}</h2>
            <p className="text-sm text-muted">
              {t("Ouverture", "Opens")} {formatDate(offering.opensAt, locale)} · {t("clôture", "closes")}{" "}
              {formatDate(offering.closesAt, locale)}.
            </p>
            {Date.parse(offering.opensAt) > Date.now() ? (
              <OfferingCountdown locale={locale} opensAt={offering.opensAt} />
            ) : null}
            <p className="text-sm">
              {t("Demande indicative", "Indicative demand")}: {demand.count}{" "}
              {t("investisseur(s)", "investor(s)")} · {formatMoney(demand.amountMinor, offering.currencyCode, locale)}{" "}
              / {formatMoney(offering.minimumRaiseMinor, offering.currencyCode, locale)} {t("min", "min")}
            </p>
          </section>
        ) : (
          <section className="rounded-[28px] bg-violet p-5 text-white">
            <h2 className="text-xl font-bold">{t("Progression, séparée", "Progress, kept separate")}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Stat label={t("Initiées", "Initiated")} value={formatMoney(progress.initiatedMinor, offering.currencyCode, locale)} />
              <Stat label={t("Paiements confirmés", "Confirmed payments")} value={formatMoney(progress.confirmedMinor, offering.currencyCode, locale)} />
              <Stat label={t("Réglés", "Settled")} value={formatMoney(progress.settledMinor, offering.currencyCode, locale)} />
              <Stat label={t("Actions allouées", "Shares allotted")} value={formatMoney(progress.allottedMinor, offering.currencyCode, locale)} />
            </dl>
            <p className="mt-3 text-xs text-white/80">
              {t("Objectif maximum", "Maximum target")} {formatMoney(offering.maximumRaiseMinor, offering.currencyCode, locale)} · {t("minimum", "minimum")} {formatMoney(offering.minimumRaiseMinor, offering.currencyCode, locale)}. {t("Ces chiffres ne sont pas additionnés en un seul « montant levé ».", "These figures are not combined into one “raised” number.")}
            </p>
          </section>
        )}
        <section className="rounded-[28px] bg-white p-5 text-sm leading-6">
          <h2 className="text-xl font-bold">{t("Termes de l'offre", "Offering terms")}</h2>
          <p className="mt-2">{t("Classe", "Class")} {shareClass.className} ({shareClass.classCode}). {t(shareClass.votingRightsFr, shareClass.votingRightsEn)}</p>
          <p>{t("Prix d'émission", "Issue price")} {formatMoney(terms.issuePriceMinor, offering.currencyCode, locale)}. {terms.sharesOffered.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")} {t("actions offertes. Pas de fraction.", "shares offered. No fractions.")}</p>
          <p>{t("Souscription", "Subscription")} {formatMoney(offering.minimumSubscriptionMinor, offering.currencyCode, locale)} – {formatMoney(offering.maximumSubscriptionMinor, offering.currencyCode, locale)}.</p>
          <p>{t("Ouverture", "Opens")} {formatDate(offering.opensAt, locale)} · {t("clôture", "closes")} {formatDate(offering.closesAt, locale)}.</p>
          <p>{t("Valorisation pré-money fictive", "Fictional pre-money valuation")}: {offering.preMoneyValuationMinor ? formatMoney(offering.preMoneyValuationMinor, offering.currencyCode, locale) : "—"}.</p>
          <p>{t("Frais de plateforme sur cette démo", "Platform fee on this demo")}: {formatMoney(offering.feeMinor, offering.currencyCode, locale)}.</p>
          <h3 className="mt-4 font-bold">{t("Table de capitalisation existante", "Existing capitalisation")}</h3>
          {offering.existingCap.map((row) => (
            <p key={row.holderEn}>{t(row.holderFr, row.holderEn)} · {row.shares.toLocaleString()} {t("actions hors de ce registre de plateforme", "shares outside this platform register")}</p>
          ))}
          <p className="mt-2">{t(offering.conditionsFr, offering.conditionsEn)}</p>
          <p>{t(offering.dividendPolicyFr, offering.dividendPolicyEn)}</p>
          <p>{t(offering.transferRestrictionsFr, offering.transferRestrictionsEn)}</p>
          <p>{t(offering.refundFr, offering.refundEn)}</p>
        </section>
        <section className="rounded-[28px] bg-white p-5">
          <h2 className="text-xl font-bold">{t("Projections et hypothèses", "Projections and assumptions")}</h2>
          <p className="mt-2 text-sm">{t(project.projectionsFr, project.projectionsEn)}</p>
          <p className="mt-2 text-sm text-muted">{t(project.assumptionsFr, project.assumptionsEn)}</p>
          <p className="mt-2 text-sm">{t("États financiers historiques : aucun. Contrats et permis réels : aucun.", "Historical financial statements: none. Real contracts and permits: none.")}</p>
        </section>
        <section className="rounded-[28px] bg-white p-5">
          <h2 className="text-xl font-bold">{t("Risques", "Risks")}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {(locale === "fr" ? project.risksFr : project.risksEn).map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-[28px] bg-white p-5">
          <h2 className="text-xl font-bold">{t("Documents", "Documents")}</h2>
          <ul className="mt-2 space-y-2">
            {docs.map((doc) => (
              <li key={doc.id}>
                <a className="font-semibold text-violet" href={`/api/documents/${doc.id}`}>
                  {t(doc.titleFr, doc.titleEn)} · {doc.version}
                </a>
              </li>
            ))}
          </ul>
        </section>
        {updates.length > 0 ? (
          <section className="rounded-[28px] bg-white p-5">
            <h2 className="text-xl font-bold">{t("Actualités approuvées", "Approved updates")}</h2>
            {updates.map((item) => (
              <article key={item.id} className="mt-3">
                <h3 className="font-semibold">{t(item.titleFr, item.titleEn)}</h3>
                <p className="text-sm text-muted">{t(item.bodyFr, item.bodyEn)}</p>
              </article>
            ))}
          </section>
        ) : null}
        <Link href={ctaHref} className="inline-flex rounded-full bg-violet px-5 py-3 font-semibold text-white">
          {ctaLabel}
        </Link>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3">
      <dt className="text-white/75">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IndustrySelect } from "@/components/choice-fields";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { SubmitButton } from "@/components/ui/submit-button";
import { PERMITTED_COUNTRIES } from "@/lib/choices";
import { formatMinorInput, toDatetimeLocalValue } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import {
  updateOfferingTermsAction,
  updateProjectContentAction,
  upsertOfferingDocumentAction,
} from "@/server/actions";
import { getSession } from "@/server/auth/session";
import { errorCopy } from "@/server/domain/errors";
import { ProjectEditorShell } from "./project-editor-shell";

export const dynamic = "force-dynamic";

const field = "h-12 w-full rounded-2xl border border-border bg-white px-3 text-sm text-ink";
const area = "min-h-28 w-full rounded-2xl border border-border bg-white px-3 py-3 text-sm text-ink";
const labelCls = "block text-xs font-semibold text-muted";

const DOC_TYPES = [
  { code: "memorandum", fr: "Note d'information", en: "Information memorandum" },
  { code: "subscription_agreement", fr: "Bulletin de souscription", en: "Subscription agreement" },
  { code: "risk_disclosure", fr: "Avertissement de risque", en: "Risk disclosure" },
] as const;

function statusTone(status: string): string {
  if (status === "PUBLISHED" || status === "OPEN" || status === "COMPLETED" || status === "APPROVED") {
    return "bg-success/12 text-success";
  }
  if (
    status === "DRAFT" ||
    status === "INTERNAL_REVIEW" ||
    status === "LEGAL_REVIEW" ||
    status === "SCHEDULED" ||
    status === "PAUSED" ||
    status === "ALLOTMENT_PENDING"
  ) {
    return "accent-chip";
  }
  if (status === "CANCELLED" || status === "FAILED_TO_REACH_MINIMUM") {
    return "bg-danger/12 text-danger";
  }
  return "bg-surface-muted text-muted";
}

export default async function ProjectAdminDetail({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const { projectId } = await params;
  const error = (await searchParams).error;
  const project = session.db.projects.find((item) => item.id === projectId);
  if (!project) notFound();
  const issuer = session.db.issuers.find((item) => item.id === project.issuerId);
  const offering = session.db.offerings.find((item) => item.projectId === project.id);
  const terms = offering
    ? session.db.offeringShareTerms.find((item) => item.offeringId === offering.id)
    : undefined;
  const docs = offering
    ? session.db.offeringDocuments.filter((item) => item.offeringId === offering.id)
    : [];
  const t = (fr: string, en: string) => tx(locale, fr, en);
  const proceedSlots = Math.max(project.useOfProceeds.length + 2, 3);
  const teamSlots = Math.max(project.team.length + 2, 3);

  const header = (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="truncate text-2xl font-bold tracking-tight">{t(project.titleFr, project.titleEn)}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(project.status)}`}>
              {t("Projet", "Project")} · {project.status}
            </span>
            {offering ? (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(offering.status)}`}>
                {t("Offre", "Offering")} · {offering.status}
              </span>
            ) : (
              <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">
                {t("Aucune offre", "No offering")}
              </span>
            )}
            {issuer ? <span className="text-sm text-muted">{issuer.legalName}</span> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {offering ? (
            <Link
              href={`/admin/offerings/${offering.id}`}
              className="inline-flex h-10 items-center rounded-full bg-violet px-4 text-sm font-semibold text-white"
            >
              {t("Transitions d'offre", "Offering transitions")}
            </Link>
          ) : null}
          {project.status === "PUBLISHED" ? (
            <Link
              href={`/projects/${project.slug}`}
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-border"
            >
              {t("Page publique", "Public page")}
            </Link>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
    </div>
  );

  return (
    <ProjectEditorShell
      header={header}
      navAriaLabel={t("Sections du projet", "Project sections")}
      sections={[
        {
          id: "overview",
          label: t("Aperçu", "Overview"),
          panel: (
            <form action={updateProjectContentAction} className="space-y-4">
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="hash" value="overview" />
              <HiddenStoryFields project={project} />
              <HiddenTeamProceedFields project={project} proceedSlots={proceedSlots} teamSlots={teamSlots} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Titre (FR)" htmlFor="titleFr">
                  <input id="titleFr" name="titleFr" required defaultValue={project.titleFr} className={field} />
                </Field>
                <Field label="Title (EN)" htmlFor="titleEn">
                  <input id="titleEn" name="titleEn" required defaultValue={project.titleEn} className={field} />
                </Field>
                <Field label={t("Lieu", "Location")} htmlFor="locationName">
                  <input id="locationName" name="locationName" required defaultValue={project.locationName} className={field} />
                </Field>
                <Field label={t("Secteur", "Industry")}>
                  <IndustrySelect locale={locale} defaultValue={project.industry} />
                </Field>
                <Field label={t("Usage des fonds", "Financing purpose")}>
                  <select name="financingPurpose" defaultValue={project.financingPurpose} className={field}>
                    <option value="START">{t("Créer la société", "Start the company")}</option>
                    <option value="FINANCE">{t("Financer la société existante", "Finance the existing company")}</option>
                  </select>
                </Field>
                <Field label={t("Statut projet", "Project status")}>
                  <select name="status" defaultValue={project.status} className={field}>
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                  </select>
                </Field>
              </div>
              <SubmitButton size="sm">{t("Enregistrer l'aperçu", "Save overview")}</SubmitButton>
            </form>
          ),
        },
        {
          id: "story",
          label: t("Récit", "Story"),
          panel: (
            <form action={updateProjectContentAction} className="space-y-4">
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="hash" value="story" />
              <HiddenOverviewFields project={project} />
              <HiddenTeamProceedFields project={project} proceedSlots={proceedSlots} teamSlots={teamSlots} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label={t("Résumé FR", "Short FR")} htmlFor="shortFr">
                  <textarea id="shortFr" name="shortFr" defaultValue={project.shortFr} className={area} />
                </Field>
                <Field label={t("Résumé EN", "Short EN")} htmlFor="shortEn">
                  <textarea id="shortEn" name="shortEn" defaultValue={project.shortEn} className={area} />
                </Field>
                <Field label={t("Description FR", "Full FR")} htmlFor="fullFr">
                  <textarea id="fullFr" name="fullFr" defaultValue={project.fullFr} className={area} />
                </Field>
                <Field label={t("Description EN", "Full EN")} htmlFor="fullEn">
                  <textarea id="fullEn" name="fullEn" defaultValue={project.fullEn} className={area} />
                </Field>
                <Field label={t("Marché FR", "Market FR")} htmlFor="marketFr">
                  <textarea id="marketFr" name="marketFr" defaultValue={project.marketFr} className={area} />
                </Field>
                <Field label={t("Marché EN", "Market EN")} htmlFor="marketEn">
                  <textarea id="marketEn" name="marketEn" defaultValue={project.marketEn} className={area} />
                </Field>
                <Field label={t("Risques FR (une ligne = un risque)", "Risks FR (one line each)")} htmlFor="risksFr">
                  <textarea id="risksFr" name="risksFr" defaultValue={project.risksFr.join("\n")} className={area} />
                </Field>
                <Field label={t("Risques EN", "Risks EN")} htmlFor="risksEn">
                  <textarea id="risksEn" name="risksEn" defaultValue={project.risksEn.join("\n")} className={area} />
                </Field>
                <Field label={t("Hypothèses FR", "Assumptions FR")} htmlFor="assumptionsFr">
                  <textarea id="assumptionsFr" name="assumptionsFr" defaultValue={project.assumptionsFr} className={area} />
                </Field>
                <Field label={t("Hypothèses EN", "Assumptions EN")} htmlFor="assumptionsEn">
                  <textarea id="assumptionsEn" name="assumptionsEn" defaultValue={project.assumptionsEn} className={area} />
                </Field>
                <Field label={t("Projections FR", "Projections FR")} htmlFor="projectionsFr">
                  <textarea id="projectionsFr" name="projectionsFr" defaultValue={project.projectionsFr} className={area} />
                </Field>
                <Field label={t("Projections EN", "Projections EN")} htmlFor="projectionsEn">
                  <textarea id="projectionsEn" name="projectionsEn" defaultValue={project.projectionsEn} className={area} />
                </Field>
              </div>
              <SubmitButton size="sm">{t("Enregistrer le récit", "Save story")}</SubmitButton>
            </form>
          ),
        },
        {
          id: "team",
          label: t("Équipe & fonds", "Team & proceeds"),
          panel: (
            <form action={updateProjectContentAction} className="space-y-5">
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="hash" value="team" />
              <HiddenOverviewFields project={project} />
              <HiddenStoryFields project={project} />
              <input type="hidden" name="proceedCount" value={proceedSlots} />
              <input type="hidden" name="teamCount" value={teamSlots} />

              <div className="space-y-3">
                <h3 className="text-sm font-bold">{t("Emploi des fonds (USD)", "Use of proceeds (USD)")}</h3>
                <div className="space-y-2">
                  {Array.from({ length: proceedSlots }).map((_, index) => {
                    const line = project.useOfProceeds[index];
                    return (
                      <div key={`proceed-${index}`} className="grid gap-2 rounded-2xl bg-lilac/40 p-3 md:grid-cols-3">
                        <input
                          name={`proceedLabelFr_${index}`}
                          defaultValue={line?.labelFr ?? ""}
                          placeholder={t("Libellé FR", "Label FR")}
                          className={field}
                        />
                        <input
                          name={`proceedLabelEn_${index}`}
                          defaultValue={line?.labelEn ?? ""}
                          placeholder={t("Libellé EN", "Label EN")}
                          className={field}
                        />
                        <input
                          name={`proceedAmount_${index}`}
                          defaultValue={line ? formatMinorInput(line.amountMinor) : ""}
                          placeholder="0.00"
                          className={field}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold">{t("Équipe", "Team")}</h3>
                <div className="space-y-2">
                  {Array.from({ length: teamSlots }).map((_, index) => {
                    const member = project.team[index];
                    return (
                      <div key={`team-${index}`} className="grid gap-2 rounded-2xl bg-lilac/40 p-3 md:grid-cols-2">
                        <input name={`teamName_${index}`} defaultValue={member?.name ?? ""} placeholder={t("Nom", "Name")} className={field} />
                        <span className="hidden md:block" />
                        <input name={`teamRoleFr_${index}`} defaultValue={member?.roleFr ?? ""} placeholder={t("Rôle FR", "Role FR")} className={field} />
                        <input name={`teamRoleEn_${index}`} defaultValue={member?.roleEn ?? ""} placeholder={t("Rôle EN", "Role EN")} className={field} />
                        <textarea
                          name={`teamExperienceFr_${index}`}
                          defaultValue={member?.experienceFr ?? ""}
                          placeholder={t("Expérience FR", "Experience FR")}
                          className={area}
                        />
                        <textarea
                          name={`teamExperienceEn_${index}`}
                          defaultValue={member?.experienceEn ?? ""}
                          placeholder={t("Expérience EN", "Experience EN")}
                          className={area}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <SubmitButton size="sm">{t("Enregistrer équipe & fonds", "Save team & proceeds")}</SubmitButton>
            </form>
          ),
        },
        {
          id: "offering",
          label: t("Termes de l'offre", "Offering terms"),
          panel: !offering || !terms ? (
            <p className="text-sm text-muted">{t("Aucune offre liée.", "No linked offering.")}</p>
          ) : (
            <form action={updateOfferingTermsAction} className="space-y-5">
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="offeringId" value={offering.id} />

              <div className="space-y-3">
                <h3 className="text-sm font-bold">{t("Identité & calendrier", "Identity & schedule")}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label={t("Nom FR", "Name FR")} htmlFor="nameFr">
                    <input id="nameFr" name="nameFr" required defaultValue={offering.nameFr} className={field} />
                  </Field>
                  <Field label={t("Name EN", "Name EN")} htmlFor="nameEn">
                    <input id="nameEn" name="nameEn" required defaultValue={offering.nameEn} className={field} />
                  </Field>
                  <Field label={t("Ouverture", "Opens")}>
                    <DatePicker
                      id="opensAt"
                      locale={locale}
                      name="opensAt"
                      withTime
                      required
                      label={t("Ouverture", "Opens")}
                      defaultValue={toDatetimeLocalValue(offering.opensAt)}
                    />
                  </Field>
                  <Field label={t("Clôture", "Closes")}>
                    <DatePicker
                      id="closesAt"
                      locale={locale}
                      name="closesAt"
                      withTime
                      required
                      label={t("Clôture", "Closes")}
                      defaultValue={toDatetimeLocalValue(offering.closesAt)}
                    />
                  </Field>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold">{t("Montants & actions", "Amounts & shares")}</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Field label={t("Levée min (USD)", "Min raise (USD)")} htmlFor="minimumRaise">
                    <input id="minimumRaise" name="minimumRaise" required defaultValue={formatMinorInput(offering.minimumRaiseMinor)} className={field} />
                  </Field>
                  <Field label={t("Levée max (USD)", "Max raise (USD)")} htmlFor="maximumRaise">
                    <input id="maximumRaise" name="maximumRaise" required defaultValue={formatMinorInput(offering.maximumRaiseMinor)} className={field} />
                  </Field>
                  <Field label={t("Souscription min (USD)", "Min subscription (USD)")} htmlFor="minimumSubscription">
                    <input
                      id="minimumSubscription"
                      name="minimumSubscription"
                      required
                      defaultValue={formatMinorInput(offering.minimumSubscriptionMinor)}
                      className={field}
                    />
                  </Field>
                  <Field label={t("Souscription max (USD)", "Max subscription (USD)")} htmlFor="maximumSubscription">
                    <input
                      id="maximumSubscription"
                      name="maximumSubscription"
                      required
                      defaultValue={formatMinorInput(offering.maximumSubscriptionMinor)}
                      className={field}
                    />
                  </Field>
                  <Field label={t("Prix d'action (USD)", "Share price (USD)")} htmlFor="issuePrice">
                    <input id="issuePrice" name="issuePrice" required defaultValue={formatMinorInput(terms.issuePriceMinor)} className={field} />
                  </Field>
                  <Field label={t("Actions offertes", "Shares offered")} htmlFor="sharesOffered">
                    <input id="sharesOffered" name="sharesOffered" type="number" required defaultValue={terms.sharesOffered} className={field} />
                  </Field>
                  <Field label={t("Actions min / investisseur", "Min shares / investor")} htmlFor="minimumShares">
                    <input
                      id="minimumShares"
                      name="minimumShares"
                      type="number"
                      required
                      defaultValue={terms.minimumSharesPerInvestor}
                      className={field}
                    />
                  </Field>
                  <Field label={t("Actions max / investisseur", "Max shares / investor")} htmlFor="maximumShares">
                    <input
                      id="maximumShares"
                      name="maximumShares"
                      type="number"
                      required
                      defaultValue={terms.maximumSharesPerInvestor}
                      className={field}
                    />
                  </Field>
                  <Field label={t("Frais plateforme (USD)", "Platform fee (USD)")} htmlFor="fee">
                    <input id="fee" name="fee" required defaultValue={formatMinorInput(offering.feeMinor)} className={field} />
                  </Field>
                  <Field label={t("Pré-money (USD, optionnel)", "Pre-money (USD, optional)")} htmlFor="preMoney">
                    <input
                      id="preMoney"
                      name="preMoney"
                      defaultValue={
                        offering.preMoneyValuationMinor == null ? "" : formatMinorInput(offering.preMoneyValuationMinor)
                      }
                      className={field}
                    />
                  </Field>
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className={labelCls}>{t("Pays autorisés", "Permitted countries")}</legend>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {PERMITTED_COUNTRIES.map((country) => (
                    <label key={country.code} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="permittedCountries"
                        value={country.code}
                        defaultChecked={offering.permittedCountries.includes(country.code)}
                      />
                      {t(country.fr, country.en)}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-3">
                <h3 className="text-sm font-bold">{t("Politiques", "Policies")}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label={t("Dividendes FR", "Dividend FR")} htmlFor="dividendPolicyFr">
                    <textarea id="dividendPolicyFr" name="dividendPolicyFr" defaultValue={offering.dividendPolicyFr} className={area} />
                  </Field>
                  <Field label={t("Dividendes EN", "Dividend EN")} htmlFor="dividendPolicyEn">
                    <textarea id="dividendPolicyEn" name="dividendPolicyEn" defaultValue={offering.dividendPolicyEn} className={area} />
                  </Field>
                  <Field label={t("Cession FR", "Transfer FR")} htmlFor="transferRestrictionsFr">
                    <textarea
                      id="transferRestrictionsFr"
                      name="transferRestrictionsFr"
                      defaultValue={offering.transferRestrictionsFr}
                      className={area}
                    />
                  </Field>
                  <Field label={t("Cession EN", "Transfer EN")} htmlFor="transferRestrictionsEn">
                    <textarea
                      id="transferRestrictionsEn"
                      name="transferRestrictionsEn"
                      defaultValue={offering.transferRestrictionsEn}
                      className={area}
                    />
                  </Field>
                  <Field label={t("Conditions FR", "Conditions FR")} htmlFor="conditionsFr">
                    <textarea id="conditionsFr" name="conditionsFr" defaultValue={offering.conditionsFr} className={area} />
                  </Field>
                  <Field label={t("Conditions EN", "Conditions EN")} htmlFor="conditionsEn">
                    <textarea id="conditionsEn" name="conditionsEn" defaultValue={offering.conditionsEn} className={area} />
                  </Field>
                  <Field label={t("Remboursement FR", "Refund FR")} htmlFor="refundFr">
                    <textarea id="refundFr" name="refundFr" defaultValue={offering.refundFr} className={area} />
                  </Field>
                  <Field label={t("Remboursement EN", "Refund EN")} htmlFor="refundEn">
                    <textarea id="refundEn" name="refundEn" defaultValue={offering.refundEn} className={area} />
                  </Field>
                </div>
              </div>
              <SubmitButton size="sm">{t("Enregistrer les termes", "Save terms")}</SubmitButton>
            </form>
          ),
        },
        {
          id: "documents",
          label: t("Documents", "Documents"),
          panel: !offering ? (
            <p className="text-sm text-muted">{t("Aucune offre liée.", "No linked offering.")}</p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
              <div className="space-y-2">
                <h3 className="text-sm font-bold">{t("Documents existants", "Existing documents")}</h3>
                <DataTable
                  locale={locale}
                  columns={
                    [
                      { id: "title", header: t("Titre", "Title"), sortable: true },
                      {
                        id: "type",
                        header: t("Type", "Type"),
                        sortable: true,
                        filter: {
                          options: uniqueFilterOptions(docs.map((doc) => doc.documentType)),
                          allLabel: t("Tous les types", "All types"),
                        },
                      },
                      { id: "version", header: t("Version", "Version"), sortable: true },
                      {
                        id: "visibility",
                        header: t("Visibilité", "Visibility"),
                        sortable: true,
                        filter: {
                          options: uniqueFilterOptions(docs.map((doc) => doc.visibility)),
                          allLabel: t("Toutes", "All"),
                        },
                      },
                    ] satisfies DataTableColumn[]
                  }
                  rows={docs.map((doc) => {
                    const title = t(doc.titleFr, doc.titleEn);
                    return {
                      id: doc.id,
                      searchValue: `${title} ${doc.documentType} ${doc.version} ${doc.visibility}`,
                      filterValues: { type: doc.documentType, visibility: doc.visibility },
                      sortValues: {
                        title,
                        type: doc.documentType,
                        version: doc.version,
                        visibility: doc.visibility,
                      },
                      cells: {
                        title: <span className="font-semibold">{title}</span>,
                        type: doc.documentType,
                        version: doc.version,
                        visibility: doc.visibility,
                      },
                      actions: (
                        <details className="min-w-[16rem] rounded-2xl border border-border bg-surface-muted/60 p-3">
                          <summary className="cursor-pointer text-sm font-semibold">
                            {t("Modifier", "Edit")}
                          </summary>
                          <div className="mt-3">
                            <DocumentForm
                              locale={locale}
                              projectId={project.id}
                              offeringId={offering.id}
                              document={doc}
                              submitLabel={t("Enregistrer le document", "Save document")}
                            />
                          </div>
                        </details>
                      ),
                    } satisfies DataTableRow;
                  })}
                  emptyMessage={t("Aucun document pour l'instant.", "No documents yet.")}
                />
              </div>

              <div className="rounded-2xl border border-dashed border-border p-4 md:p-5">
                <h3 className="font-bold">{t("Ajouter un document", "Add a document")}</h3>
                <div className="mt-3">
                  <DocumentForm
                    locale={locale}
                    projectId={project.id}
                    offeringId={offering.id}
                    submitLabel={t("Créer le document", "Create document")}
                  />
                </div>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1" htmlFor={htmlFor}>
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

type ProjectLike = {
  titleFr: string;
  titleEn: string;
  shortFr: string;
  shortEn: string;
  fullFr: string;
  fullEn: string;
  marketFr: string;
  marketEn: string;
  industry: string;
  locationName: string;
  financingPurpose: "START" | "FINANCE";
  status: "DRAFT" | "PUBLISHED";
  risksFr: string[];
  risksEn: string[];
  assumptionsFr: string;
  assumptionsEn: string;
  projectionsFr: string;
  projectionsEn: string;
  useOfProceeds: { labelFr: string; labelEn: string; amountMinor: number }[];
  team: { name: string; roleFr: string; roleEn: string; experienceFr: string; experienceEn: string }[];
};

function HiddenOverviewFields({ project }: { project: ProjectLike }) {
  return (
    <>
      <input type="hidden" name="titleFr" value={project.titleFr} />
      <input type="hidden" name="titleEn" value={project.titleEn} />
      <input type="hidden" name="locationName" value={project.locationName} />
      <input type="hidden" name="industry" value={project.industry} />
      <input type="hidden" name="financingPurpose" value={project.financingPurpose} />
      <input type="hidden" name="status" value={project.status} />
    </>
  );
}

function HiddenStoryFields({ project }: { project: ProjectLike }) {
  return (
    <>
      <input type="hidden" name="shortFr" value={project.shortFr} />
      <input type="hidden" name="shortEn" value={project.shortEn} />
      <input type="hidden" name="fullFr" value={project.fullFr} />
      <input type="hidden" name="fullEn" value={project.fullEn} />
      <input type="hidden" name="marketFr" value={project.marketFr} />
      <input type="hidden" name="marketEn" value={project.marketEn} />
      <input type="hidden" name="risksFr" value={project.risksFr.join("\n")} />
      <input type="hidden" name="risksEn" value={project.risksEn.join("\n")} />
      <input type="hidden" name="assumptionsFr" value={project.assumptionsFr} />
      <input type="hidden" name="assumptionsEn" value={project.assumptionsEn} />
      <input type="hidden" name="projectionsFr" value={project.projectionsFr} />
      <input type="hidden" name="projectionsEn" value={project.projectionsEn} />
    </>
  );
}

function HiddenTeamProceedFields({
  project,
  proceedSlots,
  teamSlots,
}: {
  project: ProjectLike;
  proceedSlots: number;
  teamSlots: number;
}) {
  return (
    <>
      <input type="hidden" name="proceedCount" value={proceedSlots} />
      <input type="hidden" name="teamCount" value={teamSlots} />
      {Array.from({ length: proceedSlots }).map((_, index) => {
        const line = project.useOfProceeds[index];
        return (
          <span key={`hp-${index}`}>
            <input type="hidden" name={`proceedLabelFr_${index}`} value={line?.labelFr ?? ""} />
            <input type="hidden" name={`proceedLabelEn_${index}`} value={line?.labelEn ?? ""} />
            <input type="hidden" name={`proceedAmount_${index}`} value={line ? formatMinorInput(line.amountMinor) : ""} />
          </span>
        );
      })}
      {Array.from({ length: teamSlots }).map((_, index) => {
        const member = project.team[index];
        return (
          <span key={`ht-${index}`}>
            <input type="hidden" name={`teamName_${index}`} value={member?.name ?? ""} />
            <input type="hidden" name={`teamRoleFr_${index}`} value={member?.roleFr ?? ""} />
            <input type="hidden" name={`teamRoleEn_${index}`} value={member?.roleEn ?? ""} />
            <input type="hidden" name={`teamExperienceFr_${index}`} value={member?.experienceFr ?? ""} />
            <input type="hidden" name={`teamExperienceEn_${index}`} value={member?.experienceEn ?? ""} />
          </span>
        );
      })}
    </>
  );
}

function DocumentForm({
  locale,
  projectId,
  offeringId,
  document,
  submitLabel,
}: {
  locale: "fr" | "en";
  projectId: string;
  offeringId: string;
  document?: {
    id: string;
    documentType: string;
    version: string;
    titleFr: string;
    titleEn: string;
    bodyFr: string;
    bodyEn: string;
    visibility: "PUBLIC" | "INVESTOR" | "RESTRICTED";
  };
  submitLabel: string;
}) {
  const t = (fr: string, en: string) => tx(locale, fr, en);
  return (
    <form action={upsertOfferingDocumentAction} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="offeringId" value={offeringId} />
      {document ? <input type="hidden" name="documentId" value={document.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("Type", "Type")}>
          <select name="documentType" defaultValue={document?.documentType ?? "memorandum"} className={field}>
            {DOC_TYPES.map((item) => (
              <option key={item.code} value={item.code}>
                {t(item.fr, item.en)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Version", "Version")} htmlFor={`doc-version-${document?.id ?? "new"}`}>
          <input
            id={`doc-version-${document?.id ?? "new"}`}
            name="version"
            required
            defaultValue={document?.version ?? "1"}
            className={field}
          />
        </Field>
        <Field label={t("Visibilité", "Visibility")}>
          <select name="visibility" defaultValue={document?.visibility ?? "PUBLIC"} className={field}>
            <option value="PUBLIC">PUBLIC</option>
            <option value="INVESTOR">INVESTOR</option>
            <option value="RESTRICTED">RESTRICTED</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={t("Titre FR", "Title FR")}>
          <input name="titleFr" required defaultValue={document?.titleFr ?? ""} className={field} />
        </Field>
        <Field label={t("Title EN", "Title EN")}>
          <input name="titleEn" required defaultValue={document?.titleEn ?? ""} className={field} />
        </Field>
        <Field label={t("Corps FR", "Body FR")}>
          <textarea name="bodyFr" required defaultValue={document?.bodyFr ?? ""} className={area} />
        </Field>
        <Field label={t("Body EN", "Body EN")}>
          <textarea name="bodyEn" required defaultValue={document?.bodyEn ?? ""} className={area} />
        </Field>
      </div>
      <SubmitButton size="sm">{submitLabel}</SubmitButton>
    </form>
  );
}

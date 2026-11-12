import Link from "next/link";
import { createProjectAction } from "@/server/actions";
import { EntitySelect, IndustrySelect } from "@/components/choice-fields";
import { ModalOpenLink, SearchParamModal } from "@/components/search-param-modal";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { SubmitButton } from "@/components/ui/submit-button";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { errorCopy } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

export default async function ProjectsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; modal?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const error = (await searchParams).error;
  const issuers = session.db.issuers;
  const field = "h-12 w-full rounded-2xl border border-border bg-white px-3 text-sm";

  const columns: DataTableColumn[] = [
    { id: "title", header: tx(locale, "Titre", "Title"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(session.db.projects.map((project) => project.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    {
      id: "offering",
      header: tx(locale, "Offre", "Offering"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(
          session.db.projects.map((project) => {
            const offering = session.db.offerings.find((item) => item.projectId === project.id);
            return offering?.status;
          }),
        ),
        allLabel: tx(locale, "Toutes les offres", "All offerings"),
      },
    },
  ];

  const rows: DataTableRow[] = session.db.projects.map((project) => {
    const offering = session.db.offerings.find((item) => item.projectId === project.id);
    const title = tx(locale, project.titleFr, project.titleEn);
    const offeringStatus = offering?.status ?? "";
    return {
      id: project.id,
      searchValue: `${title} ${project.status} ${offeringStatus}`,
      filterValues: { status: project.status, offering: offeringStatus },
      sortValues: { title, status: project.status, offering: offeringStatus },
      cells: {
        title: (
          <Link href={`/admin/projects/${project.id}`} className="font-semibold text-violet">
            {title}
          </Link>
        ),
        status: project.status,
        offering: offeringStatus || "—",
      },
      actions: (
        <Link href={`/admin/projects/${project.id}`} className="text-sm font-semibold text-violet">
          {tx(locale, "Éditer le contenu", "Edit content")}
        </Link>
      ),
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{tx(locale, "Projets", "Projects")}</h1>
          <p className="mt-1 text-sm text-muted">
            {tx(
              locale,
              "Créez un brouillon, puis enrichissez le récit et les termes sur la fiche projet.",
              "Create a draft, then enrich the story and terms on the project page.",
            )}
          </p>
        </div>
        <ModalOpenLink
          href="/admin/projects?modal=new"
          className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
        >
          {tx(locale, "Nouveau", "New")}
        </ModalOpenLink>
      </div>

      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucun projet.", "No projects.")}
      />

      <SearchParamModal
        param="modal"
        value="new"
        clearKeys={["error"]}
        title={tx(locale, "Brouillon de projet", "Project draft")}
        description={tx(
          locale,
          "Minimum pour démarrer. Complétez ensuite la fiche projet.",
          "Minimum to start. Complete the project page next.",
        )}
        size="lg"
      >
        <form action={createProjectAction} className="space-y-2">
          {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
          {issuers.length === 0 ? (
            <p className="rounded-2xl bg-lilac/60 px-4 py-3 text-sm text-ink">
              {tx(
                locale,
                "Aucun émetteur n'existe encore. Créez d'abord une société émettrice.",
                "No issuer exists yet. Create an issuer company first.",
              )}{" "}
              <Link href="/admin/issuers?modal=new" className="font-semibold text-violet">
                {tx(locale, "Ajouter un émetteur", "Add an issuer")}
              </Link>
            </p>
          ) : null}
          <EntitySelect
            locale={locale}
            name="issuerId"
            options={issuers.map((issuer) => ({ value: issuer.id, label: issuer.legalName }))}
            emptyLabel={tx(locale, "Aucun émetteur — créez-en un d'abord", "No issuers — create one first")}
            chooseLabel={tx(locale, "Choisir l'émetteur", "Choose an issuer")}
          />
          <input name="titleFr" required placeholder="Titre français" className={field} />
          <input name="titleEn" required placeholder="English title" className={field} />
          <input name="location" required placeholder="Kinshasa" className={field} />
          <IndustrySelect locale={locale} />
          <label className="block text-sm font-semibold">
            {tx(locale, "Usage des fonds", "Use of the money")}
            <select name="purpose" required defaultValue="FINANCE" className={`mt-1 ${field}`}>
              <option value="START">{tx(locale, "Créer la société", "Start the company")}</option>
              <option value="FINANCE">{tx(locale, "Financer la société existante", "Finance the existing company")}</option>
            </select>
          </label>
          <input name="min" required placeholder={tx(locale, "Levée minimum USD", "Minimum raise USD")} className={field} />
          <input name="max" required placeholder={tx(locale, "Levée maximum USD", "Maximum raise USD")} className={field} />
          <input name="price" required placeholder={tx(locale, "Prix d'une action USD", "Price per share USD")} className={field} />
          <input name="shares" required type="number" placeholder={tx(locale, "Actions offertes", "Shares offered")} className={field} />
          <SubmitButton size="sm" disabled={issuers.length === 0}>
            {tx(locale, "Créer le brouillon", "Create draft")}
          </SubmitButton>
        </form>
      </SearchParamModal>
    </div>
  );
}

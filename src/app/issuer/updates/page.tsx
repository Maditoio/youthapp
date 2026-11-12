import { EntitySelect } from "@/components/choice-fields";
import { ModalOpenLink, SearchParamModal } from "@/components/search-param-modal";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { issuerUpdateAction } from "@/server/actions";
import { issuerScope } from "@/server/issuer-scope";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function IssuerUpdates() {
  const scope = await issuerScope();
  if (!scope) return null;
  const locale = await getLocale();
  const projects = scope.session.db.projects.filter((item) => scope.issuerIds.has(item.issuerId));
  const updates = scope.session.db.projectUpdates.filter((item) =>
    projects.some((project) => project.id === item.projectId),
  );

  const columns: DataTableColumn[] = [
    { id: "title", header: tx(locale, "Titre", "Title"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(updates.map((item) => item.approvalStatus)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
  ];

  const rows: DataTableRow[] = updates.map((item) => {
    const title = tx(locale, item.titleFr, item.titleEn);
    return {
      id: item.id,
      searchValue: `${title} ${item.approvalStatus}`,
      filterValues: { status: item.approvalStatus },
      sortValues: { title, status: item.approvalStatus },
      cells: {
        title: <span className="font-semibold">{title}</span>,
        status: item.approvalStatus,
      },
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{tx(locale, "Actualités", "Updates")}</h1>
        <ModalOpenLink
          href="/issuer/updates?modal=new"
          className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
        >
          {tx(locale, "Soumettre", "Submit")}
        </ModalOpenLink>
      </div>

      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucune actualité.", "No updates yet.")}
      />

      <SearchParamModal
        title={tx(locale, "Soumettre une actualité", "Submit an update")}
        size="lg"
      >
        <form action={issuerUpdateAction} className="space-y-2">
          {projects.length === 0 ? (
            <p className="text-sm text-muted">
              {tx(
                locale,
                "Aucun projet n'est lié à votre société. Demandez à la plateforme d'en créer un.",
                "No project is linked to your company yet. Ask the platform to create one.",
              )}
            </p>
          ) : null}
          <EntitySelect
            locale={locale}
            name="projectId"
            options={projects.map((project) => ({
              value: project.id,
              label: tx(locale, project.titleFr, project.titleEn),
            }))}
            emptyLabel={tx(locale, "Aucun projet disponible", "No projects available")}
            chooseLabel={tx(locale, "Choisir un projet", "Choose a project")}
          />
          <input name="titleFr" required placeholder="Titre" className="h-12 w-full rounded-2xl border px-3" />
          <input name="titleEn" required placeholder="Title" className="h-12 w-full rounded-2xl border px-3" />
          <textarea name="bodyFr" required className="min-h-20 w-full rounded-2xl border px-3 py-2" />
          <textarea name="bodyEn" required className="min-h-20 w-full rounded-2xl border px-3 py-2" />
          <SubmitButton size="sm" disabled={projects.length === 0}>
            {tx(locale, "Soumettre à relecture", "Submit for review")}
          </SubmitButton>
        </form>
      </SearchParamModal>
    </div>
  );
}

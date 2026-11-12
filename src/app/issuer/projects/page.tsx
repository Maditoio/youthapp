import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { issuerScope } from "@/server/issuer-scope";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function IssuerProjects() {
  const scope = await issuerScope();
  if (!scope) return null;
  const locale = await getLocale();
  const projects = scope.session.db.projects.filter((item) => scope.issuerIds.has(item.issuerId));

  const columns: DataTableColumn[] = [
    { id: "title", header: tx(locale, "Titre", "Title"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(projects.map((project) => project.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
  ];

  const rows: DataTableRow[] = projects.map((project) => {
    const title = tx(locale, project.titleFr, project.titleEn);
    return {
      id: project.id,
      searchValue: `${title} ${project.status}`,
      filterValues: { status: project.status },
      sortValues: { title, status: project.status },
      cells: {
        title: <span className="font-semibold">{title}</span>,
        status: project.status,
      },
    };
  });

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Projets", "Projects")}</h1>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucun projet.", "No projects.")}
      />
    </div>
  );
}

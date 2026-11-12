import Link from "next/link";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function OfferingsAdmin() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();

  const columns: DataTableColumn[] = [
    { id: "name", header: tx(locale, "Nom", "Name"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(session.db.offerings.map((offering) => offering.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
  ];

  const rows: DataTableRow[] = session.db.offerings.map((offering) => {
    const project = session.db.projects.find((item) => item.id === offering.projectId);
    const name = tx(locale, offering.nameFr, offering.nameEn);
    return {
      id: offering.id,
      searchValue: `${name} ${offering.status}`,
      filterValues: { status: offering.status },
      sortValues: { name, status: offering.status },
      cells: {
        name: <span className="font-semibold">{name}</span>,
        status: offering.status,
      },
      actions: (
        <>
          <Link className="text-sm font-semibold text-violet" href={`/admin/offerings/${offering.id}`}>
            {tx(locale, "Transitions", "Transitions")}
          </Link>
          {project ? (
            <Link className="text-sm font-semibold text-violet" href={`/admin/projects/${project.id}`}>
              {tx(locale, "Éditer le contenu du projet", "Edit project content")}
            </Link>
          ) : null}
        </>
      ),
    };
  });

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-bold">{tx(locale, "Offres", "Offerings")}</h1>
        <p className="mt-1 text-sm text-muted">
          {tx(
            locale,
            "Les transitions de statut restent ici. Le contenu riche s'édite sur la fiche projet.",
            "Status transitions stay here. Rich content is edited on the project page.",
          )}
        </p>
      </div>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucune offre.", "No offerings.")}
      />
    </div>
  );
}

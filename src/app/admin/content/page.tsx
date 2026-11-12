import { publishUpdateAction } from "@/server/actions";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function ContentAdmin() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();

  const columns: DataTableColumn[] = [
    { id: "title", header: tx(locale, "Titre", "Title"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(session.db.projectUpdates.map((item) => item.approvalStatus)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "body", header: tx(locale, "Extrait", "Excerpt"), hideOnMobile: true },
  ];

  const rows: DataTableRow[] = session.db.projectUpdates.map((item) => {
    const title = tx(locale, item.titleFr, item.titleEn);
    const body = tx(locale, item.bodyFr, item.bodyEn);
    return {
      id: item.id,
      searchValue: `${title} ${item.approvalStatus} ${body}`,
      filterValues: { status: item.approvalStatus },
      sortValues: { title, status: item.approvalStatus, body },
      cells: {
        title: <span className="font-semibold">{title}</span>,
        status: item.approvalStatus,
        body: <span className="line-clamp-2 text-muted">{body}</span>,
      },
      actions:
        item.approvalStatus === "SUBMITTED" ? (
          <form action={publishUpdateAction}>
            <input type="hidden" name="updateId" value={item.id} />
            <SubmitButton variant="link" size="inline">
              {tx(locale, "Publier", "Publish")}
            </SubmitButton>
          </form>
        ) : null,
    };
  });

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Contenu", "Content")}</h1>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucun contenu.", "No content.")}
      />
    </div>
  );
}

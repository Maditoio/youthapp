import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const logs = [...session.db.auditLogs].reverse();

  const columns: DataTableColumn[] = [
    { id: "when", header: tx(locale, "Date", "Date"), sortable: true },
    {
      id: "action",
      header: tx(locale, "Action", "Action"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(logs.map((log) => log.action)),
        allLabel: tx(locale, "Toutes les actions", "All actions"),
      },
    },
    {
      id: "resource",
      header: tx(locale, "Ressource", "Resource"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(logs.map((log) => log.resourceType)),
        allLabel: tx(locale, "Toutes les ressources", "All resources"),
      },
    },
    { id: "reason", header: tx(locale, "Motif", "Reason"), hideOnMobile: true },
  ];

  const rows: DataTableRow[] = logs.map((log) => {
    const when = formatDateTime(log.createdAt, locale);
    const reason = log.reason ?? "";
    return {
      id: log.id,
      searchValue: `${when} ${log.action} ${log.resourceType} ${reason}`,
      filterValues: { action: log.action, resource: log.resourceType },
      sortValues: {
        when: log.createdAt,
        action: log.action,
        resource: log.resourceType,
        reason,
      },
      cells: {
        when,
        action: <span className="font-semibold">{log.action}</span>,
        resource: log.resourceType,
        reason: reason || "—",
      },
    };
  });

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Journal", "Audit log")}</h1>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucune entrée.", "No entries.")}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { readNoteAction } from "@/server/actions";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { formatDateTime } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const notes = session.db.notifications.filter((item) => item.userId === session.user.id);

  const columns: DataTableColumn[] = [
    { id: "when", header: tx(locale, "Date", "Date"), sortable: true },
    { id: "title", header: tx(locale, "Titre", "Title"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(notes.map((note) => note.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "body", header: tx(locale, "Message", "Message"), hideOnMobile: true },
  ];

  const rows: DataTableRow[] = notes.map((note) => {
    const title = tx(locale, note.titleFr, note.titleEn);
    const body = tx(locale, note.bodyFr, note.bodyEn);
    const when = formatDateTime(note.createdAt, locale);
    return {
      id: note.id,
      searchValue: `${when} ${title} ${body} ${note.status}`,
      filterValues: { status: note.status },
      sortValues: {
        when: note.createdAt,
        title,
        status: note.status,
        body,
      },
      cells: {
        when,
        title: <span className="font-semibold">{title}</span>,
        status: note.status,
        body: <span className="line-clamp-2 text-muted">{body}</span>,
      },
      actions:
        note.status === "UNREAD" ? (
          <form action={readNoteAction}>
            <input type="hidden" name="id" value={note.id} />
            <SubmitButton variant="link" size="inline">
              {tx(locale, "Marquer comme lu", "Mark read")}
            </SubmitButton>
          </form>
        ) : null,
    };
  });

  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Notifications", "Notifications")}</h1>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucune notification.", "No notifications.")}
      />
    </div>
  );
}

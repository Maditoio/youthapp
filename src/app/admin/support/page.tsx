import { ModalOpenLink, SearchParamValueModal } from "@/components/search-param-modal";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
import { replyAction } from "@/server/actions";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function SupportAdmin({
  searchParams,
}: {
  searchParams: Promise<{ reply?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const params = await searchParams;
  const replyTicketId = params.reply;
  const replyTicket = replyTicketId
    ? session.db.supportTickets.find((item) => item.id === replyTicketId)
    : undefined;

  const columns: DataTableColumn[] = [
    { id: "subject", header: tx(locale, "Sujet", "Subject"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(session.db.supportTickets.map((ticket) => ticket.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "preview", header: tx(locale, "Dernier message", "Latest message"), hideOnMobile: true },
  ];

  const rows: DataTableRow[] = session.db.supportTickets.map((ticket) => {
    const messages = session.db.supportMessages.filter((item) => item.ticketId === ticket.id);
    const latest = messages[messages.length - 1];
    const preview = latest
      ? `${latest.internal ? tx(locale, "Note interne : ", "Internal note: ") : ""}${latest.message}`
      : "—";
    return {
      id: ticket.id,
      searchValue: `${ticket.subject} ${ticket.status} ${preview}`,
      filterValues: { status: ticket.status },
      sortValues: {
        subject: ticket.subject,
        status: ticket.status,
        preview,
      },
      cells: {
        subject: <span className="font-semibold">{ticket.subject}</span>,
        status: ticket.status,
        preview: <span className="line-clamp-2 text-muted">{preview}</span>,
      },
      actions: (
        <ModalOpenLink
          href={`/admin/support?reply=${encodeURIComponent(ticket.id)}`}
          className="inline-flex rounded-full bg-violet px-3 py-1.5 text-xs font-semibold text-white"
        >
          {tx(locale, "Répondre", "Reply")}
        </ModalOpenLink>
      ),
    };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Support</h1>
      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucun ticket.", "No tickets.")}
      />

      {replyTicketId ? (
        <SearchParamValueModal param="reply" title={tx(locale, "Répondre au ticket", "Reply to ticket")}>
          <form action={replyAction} className="space-y-2">
            <input type="hidden" name="ticketId" value={replyTicketId} />
            {replyTicket ? <p className="text-sm text-muted">{replyTicket.subject}</p> : null}
            <textarea name="message" required className="min-h-28 w-full rounded-2xl border px-3 py-2" />
            <label className="flex gap-2 text-xs">
              <input type="checkbox" name="internal" />
              {tx(locale, "Note interne", "Internal note")}
            </label>
            <SubmitButton size="sm">{tx(locale, "Répondre", "Reply")}</SubmitButton>
          </form>
        </SearchParamValueModal>
      ) : null}
    </div>
  );
}

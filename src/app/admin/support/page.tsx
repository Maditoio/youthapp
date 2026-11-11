import { ModalOpenLink, SearchParamValueModal } from "@/components/search-param-modal";
import { replyAction } from "@/server/actions";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function SupportAdmin() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Support</h1>
      {session.db.supportTickets.map((ticket) => (
        <article key={ticket.id} className="rounded-[24px] bg-white p-4 text-sm">
          <p className="font-bold">
            {ticket.subject} · {ticket.status}
          </p>
          {session.db.supportMessages
            .filter((item) => item.ticketId === ticket.id)
            .map((message) => (
              <p key={message.id} className={message.internal ? "text-muted" : ""}>
                {message.internal ? tx(locale, "Note interne : ", "Internal note: ") : ""}
                {message.message}
              </p>
            ))}
          <ModalOpenLink
            href={`/admin/support?reply=${encodeURIComponent(ticket.id)}`}
            className="mt-2 inline-flex rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
          >
            {tx(locale, "Répondre", "Reply")}
          </ModalOpenLink>
        </article>
      ))}

      <SearchParamValueModal
        param="reply"
        titleFor={() => tx(locale, "Répondre au ticket", "Reply to ticket")}
      >
        {(ticketId) => {
          const ticket = session.db.supportTickets.find((item) => item.id === ticketId);
          return (
            <form action={replyAction} className="space-y-2">
              <input type="hidden" name="ticketId" value={ticketId} />
              {ticket ? <p className="text-sm text-muted">{ticket.subject}</p> : null}
              <textarea name="message" required className="min-h-28 w-full rounded-2xl border px-3 py-2" />
              <label className="flex gap-2 text-xs">
                <input type="checkbox" name="internal" />
                {tx(locale, "Note interne", "Internal note")}
              </label>
              <SubmitButton size="sm">{tx(locale, "Répondre", "Reply")}</SubmitButton>
            </form>
          );
        }}
      </SearchParamValueModal>
    </div>
  );
}

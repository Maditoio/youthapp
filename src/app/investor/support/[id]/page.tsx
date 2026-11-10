import { notFound, redirect } from "next/navigation";
import { replyAction } from "@/server/actions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const { id } = await params;
  const ticket = session.db.supportTickets.find((item) => item.id === id && item.userId === session.user.id);
  if (!ticket) notFound();
  const messages = session.db.supportMessages.filter((item) => item.ticketId === ticket.id && !item.internal);
  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{ticket.subject}</h1>
      {messages.map((message) => (
        <p key={message.id} className="rounded-2xl bg-white p-4 text-sm">{message.message}</p>
      ))}
      <form action={replyAction} className="space-y-2">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <textarea name="message" required className="min-h-24 w-full rounded-2xl border bg-white px-3 py-2" />
        <button className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white">{tx(locale, "Répondre", "Reply")}</button>
      </form>
    </div>
  );
}

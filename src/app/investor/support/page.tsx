import Link from "next/link";
import { redirect } from "next/navigation";
import { ticketAction } from "@/server/actions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const tickets = session.db.supportTickets.filter((item) => item.userId === session.user.id);
  return (
    <div className="space-y-4 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Assistance", "Support")}</h1>
      {tickets.map((ticket) => (
        <Link key={ticket.id} href={`/investor/support/${ticket.id}`} className="block rounded-[28px] bg-white p-4">
          <p className="font-bold">{ticket.subject}</p>
          <p className="text-xs text-muted">{ticket.status}</p>
        </Link>
      ))}
      <form action={ticketAction} className="space-y-2 rounded-[28px] bg-white p-4">
        <input name="category" defaultValue="general" className="h-12 w-full rounded-2xl border px-3" />
        <input name="subject" required placeholder={tx(locale, "Sujet", "Subject")} className="h-12 w-full rounded-2xl border px-3" />
        <textarea name="message" required className="min-h-28 w-full rounded-2xl border px-3 py-2" />
        <button className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white">{tx(locale, "Envoyer", "Send")}</button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ModalOpenLink, SearchParamModal } from "@/components/search-param-modal";
import { ticketAction } from "@/server/actions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const tickets = session.db.supportTickets.filter((item) => item.userId === session.user.id);
  return (
    <div className="space-y-4 px-4 md:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{tx(locale, "Assistance", "Support")}</h1>
        <ModalOpenLink
          href="/investor/support?modal=new"
          className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
        >
          {tx(locale, "Nouveau message", "New message")}
        </ModalOpenLink>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={`/investor/support/${ticket.id}`} className="block rounded-[28px] bg-white p-4">
            <p className="font-bold">{ticket.subject}</p>
            <p className="text-xs text-muted">{ticket.status}</p>
          </Link>
        ))}
        {tickets.length === 0 ? (
          <p className="text-sm text-muted md:col-span-2">
            {tx(locale, "Aucun ticket pour l'instant.", "No tickets yet.")}
          </p>
        ) : null}
      </div>

      <SearchParamModal title={tx(locale, "Nouveau message", "New message")}>
        <form action={ticketAction} className="space-y-2">
          <input name="category" defaultValue="general" className="h-12 w-full rounded-2xl border px-3" />
          <input
            name="subject"
            required
            placeholder={tx(locale, "Sujet", "Subject")}
            className="h-12 w-full rounded-2xl border px-3"
          />
          <textarea name="message" required className="min-h-28 w-full rounded-2xl border px-3 py-2" />
          <SubmitButton size="sm">{tx(locale, "Envoyer", "Send")}</SubmitButton>
        </form>
      </SearchParamModal>
    </div>
  );
}

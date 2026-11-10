import { ProsePage } from "@/components/prose-page";
import { ticketAction } from "@/server/actions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const locale = await getLocale();
  const sent = (await searchParams).sent;
  return (
    <ProsePage locale={locale} returnTo="/contact" title={tx(locale, "Contact", "Contact")}>
      {sent ? <p>{tx(locale, "Message reçu dans la file de démonstration.", "Message received in the demonstration queue.")}</p> : null}
      <form action={ticketAction} className="space-y-2">
        <input name="category" defaultValue="public" className="h-12 w-full rounded-2xl border px-3" />
        <input name="subject" required placeholder={tx(locale, "Sujet", "Subject")} className="h-12 w-full rounded-2xl border px-3" />
        <textarea name="message" required className="min-h-28 w-full rounded-2xl border px-3 py-2" />
        <button className="rounded-full bg-violet px-4 py-2 font-semibold text-white">{tx(locale, "Envoyer", "Send")}</button>
      </form>
    </ProsePage>
  );
}

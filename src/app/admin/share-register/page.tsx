import { approveAllotmentAction, prepareAllotmentAction } from "@/server/actions";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { ids } from "@/server/db/seed";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const waiting = session.db.subscriptions.filter((item) => item.status === "PAID_AWAITING_CLOSING" && item.offeringId === ids.offering);
  const batches = session.db.allotmentBatches;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Registre de démonstration", "Demonstration register")}</h1>
      <p className="text-sm text-muted">{tx(locale, "Ce registre n'est pas présenté comme le registre statutaire légal.", "This register is not presented as the statutory legal register.")}</p>
      <form action={prepareAllotmentAction} className="space-y-2 rounded-[24px] bg-white p-4 text-sm">
        <input type="hidden" name="offeringId" value={ids.offering} />
        {waiting.map((sub) => (
          <label key={sub.id} className="flex gap-2">
            <input type="checkbox" name="subscriptionId" value={sub.id} />
            {sub.reference} · {sub.shareQuantity}
          </label>
        ))}
        {waiting.length === 0 ? <p>{tx(locale, "Rien à préparer.", "Nothing to prepare.")}</p> : <button className="rounded-full bg-violet px-4 py-2 font-semibold text-white">{tx(locale, "Préparer le lot", "Prepare batch")}</button>}
      </form>
      {batches.filter((batch) => batch.status === "PREPARED").map((batch) => (
        <form key={batch.id} action={approveAllotmentAction} className="space-y-2 rounded-[24px] bg-white p-4 text-sm">
          <input type="hidden" name="batchId" value={batch.id} />
          <p>{batch.id} · {tx(locale, "préparé par", "prepared by")} {batch.preparedBy}</p>
          <input name="evidence" required placeholder={tx(locale, "Référence de preuve", "Evidence reference")} className="h-11 w-full rounded-2xl border px-3" />
          <input name="password" type="password" required placeholder={tx(locale, "Mot de passe", "Password")} className="h-11 w-full rounded-2xl border px-3" />
          <button className="rounded-full bg-violet px-4 py-2 font-semibold text-white">{tx(locale, "Approuver l'émission", "Approve issuance")}</button>
        </form>
      ))}
      <h2 className="text-xl font-bold">{tx(locale, "Écritures", "Events")}</h2>
      {session.db.shareholdingEvents.map((event) => (
        <p key={event.id} className="text-sm">{event.eventType} · {event.shareQuantityDelta} · {event.investorProfileId}</p>
      ))}
    </div>
  );
}

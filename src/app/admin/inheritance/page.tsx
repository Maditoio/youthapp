import { inheritanceAdvanceAction, inheritanceApproveAction, inheritanceTransferAction } from "@/server/actions";
import { errorCopy } from "@/server/domain/errors";
import { INHERITANCE_NEXT } from "@/server/domain/mutate";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function InheritanceAdmin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const error = (await searchParams).error;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Successions", "Estates")}</h1>
      {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
      <p className="text-sm text-muted">{tx(locale, "Deux approbations distinctes, puis une troisième personne, sont nécessaires avant toute écriture de transfert.", "Two different approvals, then a third person, are required before any transfer entry.")}</p>
      {session.db.inheritanceCases.length === 0 ? <p className="text-sm">{tx(locale, "Aucun dossier.", "No cases.")}</p> : null}
      {session.db.inheritanceCases.map((item) => (
        <article key={item.id} className="space-y-2 rounded-[24px] bg-white p-4 text-sm">
          <p className="font-bold">{item.status} · {item.deceasedInvestorProfileId}</p>
          <p>{tx(locale, "Registre modifié", "Register changed")}: {item.registerUpdated ? tx(locale, "oui", "yes") : tx(locale, "non", "no")}</p>
          <form action={inheritanceApproveAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="caseId" value={item.id} />
            <input name="evidence" placeholder={tx(locale, "Référence de preuve", "Evidence reference")} className="h-10 rounded-full border px-3" />
            <input name="password" type="password" required className="h-10 rounded-full border px-3" />
            <button className="rounded-full bg-violet px-3 text-white">{tx(locale, "Approuver", "Approve")}</button>
          </form>
          <form action={inheritanceAdvanceAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="caseId" value={item.id} />
            {INHERITANCE_NEXT[item.status].filter((status) => status !== "COMPLETED").length > 0 ? (
              <select name="to" required defaultValue="" className="h-10 rounded-full border bg-white px-3 text-sm">
                <option value="">{tx(locale, "Choisir l'état", "Choose a state")}</option>
                {INHERITANCE_NEXT[item.status]
                  .filter((status) => status !== "COMPLETED")
                  .map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
              </select>
            ) : (
              <p className="text-xs text-muted">{tx(locale, "Aucun état suivant par cette action.", "No next state from this action.")}</p>
            )}
            <input name="notes" className="h-10 rounded-full border px-3" />
            <input name="password" type="password" required className="h-10 rounded-full border px-3" />
            <button className="rounded-full border px-3">{tx(locale, "Changer l'état", "Change state")}</button>
          </form>
          <form action={inheritanceTransferAction} className="grid gap-2 md:grid-cols-2">
            <input type="hidden" name="caseId" value={item.id} />
            <input name="fromId" defaultValue={item.deceasedInvestorProfileId} className="h-10 rounded-full border px-3" />
            <input name="toId" placeholder={tx(locale, "Profil destinataire", "Recipient profile")} className="h-10 rounded-full border px-3" />
            <input name="shareClassId" placeholder="class-ordinary" className="h-10 rounded-full border px-3" />
            <input name="quantity" type="number" className="h-10 rounded-full border px-3" />
            <input name="password" type="password" required className="h-10 rounded-full border px-3" />
            <button className="rounded-full bg-ink px-3 py-2 text-white">{tx(locale, "Écrire le transfert", "Record the transfer")}</button>
          </form>
        </article>
      ))}
    </div>
  );
}

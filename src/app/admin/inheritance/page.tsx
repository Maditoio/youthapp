import { ModalOpenLink, SearchParamModal } from "@/components/search-param-modal";
import { inheritanceAdvanceAction, inheritanceApproveAction, inheritanceTransferAction } from "@/server/actions";
import { errorCopy } from "@/server/domain/errors";
import { INHERITANCE_NEXT } from "@/server/domain/mutate";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function InheritanceAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; modal?: string; case?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const params = await searchParams;
  const error = params.error;
  const caseId = params.case ?? "";
  const activeCase = session.db.inheritanceCases.find((item) => item.id === caseId);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Successions", "Estates")}</h1>
      <p className="text-sm text-muted">
        {tx(
          locale,
          "Deux approbations distinctes, puis une troisième personne, sont nécessaires avant toute écriture de transfert.",
          "Two different approvals, then a third person, are required before any transfer entry.",
        )}
      </p>
      {session.db.inheritanceCases.length === 0 ? (
        <p className="text-sm">{tx(locale, "Aucun dossier.", "No cases.")}</p>
      ) : null}
      {session.db.inheritanceCases.map((item) => (
        <article key={item.id} className="space-y-3 rounded-[24px] bg-white p-4 text-sm">
          <p className="font-bold">
            {item.status} · {item.deceasedInvestorProfileId}
          </p>
          <p>
            {tx(locale, "Registre modifié", "Register changed")}:{" "}
            {item.registerUpdated ? tx(locale, "oui", "yes") : tx(locale, "non", "no")}
          </p>
          <div className="flex flex-wrap gap-2">
            <ModalOpenLink
              href={`/admin/inheritance?modal=approve&case=${encodeURIComponent(item.id)}`}
              className="rounded-full bg-violet px-3 py-1.5 text-xs font-semibold text-white"
            >
              {tx(locale, "Approuver", "Approve")}
            </ModalOpenLink>
            <ModalOpenLink
              href={`/admin/inheritance?modal=advance&case=${encodeURIComponent(item.id)}`}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold"
            >
              {tx(locale, "Changer l'état", "Change state")}
            </ModalOpenLink>
            <ModalOpenLink
              href={`/admin/inheritance?modal=transfer&case=${encodeURIComponent(item.id)}`}
              className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"
            >
              {tx(locale, "Écrire le transfert", "Record transfer")}
            </ModalOpenLink>
          </div>
        </article>
      ))}

      <SearchParamModal
        param="modal"
        value="approve"
        clearKeys={["error", "case"]}
        title={tx(locale, "Approuver le dossier", "Approve the case")}
      >
        {activeCase ? (
          <form action={inheritanceApproveAction} className="space-y-2">
            {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
            <input type="hidden" name="caseId" value={activeCase.id} />
            <input
              name="evidence"
              placeholder={tx(locale, "Référence de preuve", "Evidence reference")}
              className="h-12 w-full rounded-2xl border px-3"
            />
            <input name="password" type="password" required className="h-12 w-full rounded-2xl border px-3" />
            <SubmitButton size="sm">{tx(locale, "Approuver", "Approve")}</SubmitButton>
          </form>
        ) : (
          <p className="text-sm text-muted">{tx(locale, "Dossier introuvable.", "Case not found.")}</p>
        )}
      </SearchParamModal>

      <SearchParamModal
        param="modal"
        value="advance"
        clearKeys={["error", "case"]}
        title={tx(locale, "Changer l'état", "Change state")}
      >
        {activeCase ? (
          <form action={inheritanceAdvanceAction} className="space-y-2">
            {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
            <input type="hidden" name="caseId" value={activeCase.id} />
            {INHERITANCE_NEXT[activeCase.status].filter((status) => status !== "COMPLETED").length > 0 ? (
              <select name="to" required defaultValue="" className="h-12 w-full rounded-2xl border bg-white px-3 text-sm">
                <option value="">{tx(locale, "Choisir l'état", "Choose a state")}</option>
                {INHERITANCE_NEXT[activeCase.status]
                  .filter((status) => status !== "COMPLETED")
                  .map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
              </select>
            ) : (
              <p className="text-xs text-muted">
                {tx(locale, "Aucun état suivant par cette action.", "No next state from this action.")}
              </p>
            )}
            <input name="notes" className="h-12 w-full rounded-2xl border px-3" />
            <input name="password" type="password" required className="h-12 w-full rounded-2xl border px-3" />
            <SubmitButton variant="secondary" size="sm">
              {tx(locale, "Changer l'état", "Change state")}
            </SubmitButton>
          </form>
        ) : (
          <p className="text-sm text-muted">{tx(locale, "Dossier introuvable.", "Case not found.")}</p>
        )}
      </SearchParamModal>

      <SearchParamModal
        param="modal"
        value="transfer"
        clearKeys={["error", "case"]}
        title={tx(locale, "Écrire le transfert", "Record the transfer")}
        size="lg"
      >
        {activeCase ? (
          <form action={inheritanceTransferAction} className="grid gap-2 md:grid-cols-2">
            {error ? <p className="text-sm text-danger md:col-span-2">{errorCopy[error]?.[locale] ?? error}</p> : null}
            <input type="hidden" name="caseId" value={activeCase.id} />
            <input
              name="fromId"
              defaultValue={activeCase.deceasedInvestorProfileId}
              className="h-12 rounded-2xl border px-3"
            />
            <input
              name="toId"
              placeholder={tx(locale, "Profil destinataire", "Recipient profile")}
              className="h-12 rounded-2xl border px-3"
            />
            <input name="shareClassId" placeholder="class-ordinary" className="h-12 rounded-2xl border px-3" />
            <input name="quantity" type="number" className="h-12 rounded-2xl border px-3" />
            <input name="password" type="password" required className="h-12 rounded-2xl border px-3 md:col-span-2" />
            <SubmitButton variant="ink" size="sm" className="md:col-span-2">
              {tx(locale, "Écrire le transfert", "Record the transfer")}
            </SubmitButton>
          </form>
        ) : (
          <p className="text-sm text-muted">{tx(locale, "Dossier introuvable.", "Case not found.")}</p>
        )}
      </SearchParamModal>
    </div>
  );
}

import { kycDecisionAction } from "@/server/actions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { maskValue } from "@/lib/format";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const cases = session.db.kycCases.filter((item) => item.status !== "APPROVED" && item.status !== "NOT_STARTED");
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Revue d'identité", "Identity review")}</h1>
      {cases.map((item) => {
        const profile = session.db.investorProfiles.find((row) => row.id === item.investorProfileId);
        const doc = [...session.db.kycDocuments].reverse().find((row) => row.kycCaseId === item.id);
        return (
          <form key={item.id} action={kycDecisionAction} className="space-y-2 rounded-[24px] bg-white p-4 text-sm">
            <input type="hidden" name="caseId" value={item.id} />
            <p className="font-bold">{profile?.legalFirstName} {profile?.legalLastName} · {item.status}</p>
            {doc ? <p>{doc.documentType} · {doc.issuingCountryCode} · {maskValue(doc.documentNumber)} · {doc.manualReviewRequired ? tx(locale, "revue manuelle", "manual review") : "ok"}</p> : null}
            <input name="reason" required placeholder={tx(locale, "Code motif", "Reason code")} className="h-11 w-full rounded-2xl border px-3" />
            <textarea name="notes" placeholder={tx(locale, "Notes", "Notes")} className="min-h-20 w-full rounded-2xl border px-3 py-2" />
            <input name="password" type="password" required placeholder={tx(locale, "Mot de passe de confirmation", "Confirmation password")} className="h-11 w-full rounded-2xl border px-3" />
            <div className="flex flex-wrap gap-2">
              {(["APPROVED", "ADDITIONAL_INFORMATION_REQUIRED", "REJECTED", "SUSPENDED"] as const).map((decision) => (
                <button key={decision} name="decision" value={decision} className="rounded-full bg-violet px-3 py-2 text-xs font-semibold text-white">{decision}</button>
              ))}
            </div>
          </form>
        );
      })}
      {cases.length === 0 ? <p className="text-sm text-muted">{tx(locale, "Aucune revue en attente.", "No review waiting.")}</p> : null}
    </div>
  );
}

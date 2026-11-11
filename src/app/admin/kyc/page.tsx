import { AdminReasonField } from "@/components/admin-reason-field";
import { AdminStepUpField } from "@/components/admin-step-up-field";
import { kycDecisionAction } from "@/server/actions";
import { errorCopy } from "@/server/domain/errors";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { maskValue } from "@/lib/format";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

const DECISIONS = [
  {
    value: "APPROVED" as const,
    fr: "Approuver",
    en: "Approve",
  },
  {
    value: "ADDITIONAL_INFORMATION_REQUIRED" as const,
    fr: "Demander des documents",
    en: "Request more documents",
  },
  {
    value: "REJECTED" as const,
    fr: "Refuser",
    en: "Reject",
  },
  {
    value: "SUSPENDED" as const,
    fr: "Suspendre",
    en: "Suspend",
  },
];

export default async function KycPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const error = (await searchParams).error;
  const hasPassword = Boolean(session.user.passwordHash);
  const ownStaffCode =
    session.db.staffProfiles.find((item) => item.userId === session.user.id && item.status === "ACTIVE")
      ?.mfaCodeDisplay ?? null;
  const cases = session.db.kycCases.filter((item) => item.status !== "APPROVED" && item.status !== "NOT_STARTED");
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Revue d'identité", "Identity review")}</h1>
      {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
      <p className="text-sm text-muted">
        {tx(
          locale,
          "Maker-checker : vous ne pouvez pas valider votre propre dossier. Chaque décision exige une confirmation d'étape.",
          "Maker-checker: you cannot approve your own case. Every decision requires step-up confirmation.",
        )}
      </p>
      {cases.map((item) => {
        const profile = session.db.investorProfiles.find((row) => row.id === item.investorProfileId);
        const doc = [...session.db.kycDocuments].reverse().find((row) => row.kycCaseId === item.id);
        const ownCase = profile?.userId === session.user.id;
        return (
          <form key={item.id} action={kycDecisionAction} className="space-y-2 rounded-[24px] bg-white p-4 text-sm">
            <input type="hidden" name="caseId" value={item.id} />
            <p className="font-bold">
              {profile?.legalFirstName} {profile?.legalLastName} · {item.status}
            </p>
            {doc ? (
              <p>
                {doc.documentType} · {doc.issuingCountryCode} · {maskValue(doc.documentNumber)} ·{" "}
                {doc.manualReviewRequired ? tx(locale, "revue manuelle", "manual review") : "ok"}
              </p>
            ) : (
              <p className="text-muted">{tx(locale, "Aucun document déposé.", "No document uploaded.")}</p>
            )}
            {item.reasonCode ? <p className="text-muted">{tx(locale, "Motif actuel", "Current reason")}: {item.reasonCode}</p> : null}
            {item.reviewNotes ? <p className="text-muted">{item.reviewNotes}</p> : null}
            {ownCase ? (
              <p className="text-sm text-danger">
                {tx(
                  locale,
                  "Ce dossier vous appartient : un autre membre du personnel doit le décider.",
                  "This case is yours: another staff member must decide it.",
                )}
              </p>
            ) : null}
            <AdminReasonField
              placeholder={tx(locale, "Code motif (obligatoire)", "Reason code (required)")}
              className="h-11 w-full rounded-2xl border px-3"
            />
            <textarea
              name="notes"
              placeholder={tx(
                locale,
                "Notes (obligatoires si revue manuelle à l'approbation)",
                "Notes (required when approving a manual-review document)",
              )}
              className="min-h-20 w-full rounded-2xl border px-3 py-2"
            />
            <AdminStepUpField
              locale={locale}
              hasPassword={hasPassword}
              ownStaffCode={ownStaffCode}
              className="h-11 w-full rounded-2xl border px-3"
            />
            <div className="flex flex-wrap gap-2">
              {DECISIONS.map((decision) => (
                <button
                  key={decision.value}
                  type="submit"
                  name="decision"
                  value={decision.value}
                  disabled={ownCase}
                  className="rounded-full bg-violet px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {tx(locale, decision.fr, decision.en)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              {tx(
                locale,
                "Utilisez un bouton de décision pour soumettre. Entrée dans le motif ne décide pas.",
                "Use a decision button to submit. Enter in the reason field does not decide.",
              )}
            </p>
          </form>
        );
      })}
      {cases.length === 0 ? <p className="text-sm text-muted">{tx(locale, "Aucune revue en attente.", "No review waiting.")}</p> : null}
    </div>
  );
}

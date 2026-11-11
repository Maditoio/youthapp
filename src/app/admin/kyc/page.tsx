import { AdminKycReviewForm } from "@/components/admin-kyc-review-form";
import { ModalOpenLink, SearchParamValueModal } from "@/components/search-param-modal";
import { errorCopy } from "@/server/domain/errors";
import { getLocale } from "@/lib/i18n/get-dictionary";
import {
  kycReasonLabel,
  kycStatusLabel,
  parseKycReviewNotes,
  requestableDocumentLabel,
} from "@/lib/kyc-decisions";
import { tx } from "@/lib/i18n/tx";
import { maskValue } from "@/lib/format";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; review?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const params = await searchParams;
  const error = params.error;
  const hasPassword = Boolean(session.user.passwordHash);
  const ownStaffCode =
    session.db.staffProfiles.find((item) => item.userId === session.user.id && item.status === "ACTIVE")
      ?.mfaCodeDisplay ?? null;
  const cases = session.db.kycCases.filter((item) => item.status !== "APPROVED" && item.status !== "NOT_STARTED");
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{tx(locale, "Revue d'identité", "Identity review")}</h1>
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
        const parsed = parseKycReviewNotes(item.reviewNotes);
        return (
          <article key={item.id} className="space-y-3 rounded-[24px] bg-white p-4 text-sm">
            <div className="min-w-0 space-y-1">
              <p className="font-bold">
                {profile?.legalFirstName} {profile?.legalLastName} · {kycStatusLabel(locale, item.status)}
              </p>
              {doc ? (
                <p className="break-words text-muted">
                  {doc.documentType} · {doc.issuingCountryCode} · {maskValue(doc.documentNumber)} ·{" "}
                  {doc.manualReviewRequired ? tx(locale, "revue manuelle", "manual review") : "ok"}
                </p>
              ) : (
                <p className="text-muted">{tx(locale, "Aucun document déposé.", "No document uploaded.")}</p>
              )}
              {item.reasonCode ? (
                <p className="break-words text-muted">
                  {tx(locale, "Motif actuel", "Current reason")}:{" "}
                  {kycReasonLabel(
                    locale,
                    item.status === "ADDITIONAL_INFORMATION_REQUIRED" ||
                      item.status === "REJECTED" ||
                      item.status === "SUSPENDED" ||
                      item.status === "APPROVED"
                      ? item.status
                      : null,
                    item.reasonCode,
                  )}
                </p>
              ) : null}
              {parsed.notes ? <p className="break-words text-muted">{parsed.notes}</p> : null}
              {parsed.requestedDocumentTypes.length > 0 ? (
                <p className="break-words text-muted">
                  {tx(locale, "Documents demandés", "Requested documents")}:{" "}
                  {parsed.requestedDocumentTypes.map((code) => requestableDocumentLabel(locale, code)).join(", ")}
                </p>
              ) : null}
              {ownCase ? (
                <p className="text-sm text-danger">
                  {tx(
                    locale,
                    "Ce dossier vous appartient : un autre membre du personnel doit le décider.",
                    "This case is yours: another staff member must decide it.",
                  )}
                </p>
              ) : null}
            </div>
            <ModalOpenLink
              href={`/admin/kyc?review=${encodeURIComponent(item.id)}`}
              className="inline-flex rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
            >
              {tx(locale, "Décider", "Review")}
            </ModalOpenLink>
          </article>
        );
      })}
      {cases.length === 0 ? (
        <p className="text-sm text-muted">{tx(locale, "Aucune revue en attente.", "No review waiting.")}</p>
      ) : null}

      <SearchParamValueModal
        param="review"
        clearKeys={["error"]}
        size="lg"
        titleFor={() => tx(locale, "Décision d'identité", "Identity decision")}
      >
        {(caseId) => {
          const item = cases.find((row) => row.id === caseId);
          if (!item) {
            return <p className="text-sm text-muted">{tx(locale, "Dossier introuvable.", "Case not found.")}</p>;
          }
          const profile = session.db.investorProfiles.find((row) => row.id === item.investorProfileId);
          const ownCase = profile?.userId === session.user.id;
          return (
            <div className="space-y-3">
              {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
              <p className="text-sm text-muted">
                {profile?.legalFirstName} {profile?.legalLastName} · {kycStatusLabel(locale, item.status)}
              </p>
              <AdminKycReviewForm
                locale={locale}
                caseId={item.id}
                ownCase={ownCase}
                hasPassword={hasPassword}
                ownStaffCode={ownStaffCode}
              />
            </div>
          );
        }}
      </SearchParamValueModal>
    </div>
  );
}

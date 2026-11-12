import { AdminKycReviewForm } from "@/components/admin-kyc-review-form";
import { ModalOpenLink, SearchParamValueModal } from "@/components/search-param-modal";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
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
  const reviewId = params.review;
  const hasPassword = Boolean(session.user.passwordHash);
  const ownStaffCode =
    session.db.staffProfiles.find((item) => item.userId === session.user.id && item.status === "ACTIVE")
      ?.mfaCodeDisplay ?? null;
  const cases = session.db.kycCases.filter((item) => item.status !== "APPROVED" && item.status !== "NOT_STARTED");
  const reviewCase = reviewId ? cases.find((row) => row.id === reviewId) : undefined;
  const reviewProfile = reviewCase
    ? session.db.investorProfiles.find((row) => row.id === reviewCase.investorProfileId)
    : undefined;
  const reviewOwnCase = reviewProfile?.userId === session.user.id;

  const columns: DataTableColumn[] = [
    { id: "investor", header: tx(locale, "Investisseur", "Investor"), sortable: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(
          cases.map((item) => item.status),
          (value) => kycStatusLabel(locale, value as never),
        ),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
    { id: "document", header: tx(locale, "Document", "Document"), hideOnMobile: true },
    { id: "notes", header: tx(locale, "Notes", "Notes"), hideOnMobile: true },
  ];

  const rows: DataTableRow[] = cases.map((item) => {
    const profile = session.db.investorProfiles.find((row) => row.id === item.investorProfileId);
    const doc = [...session.db.kycDocuments].reverse().find((row) => row.kycCaseId === item.id);
    const ownCase = profile?.userId === session.user.id;
    const parsed = parseKycReviewNotes(item.reviewNotes);
    const investorName = `${profile?.legalFirstName ?? ""} ${profile?.legalLastName ?? ""}`.trim();
    const statusLabel = kycStatusLabel(locale, item.status);
    const documentLabel = doc
      ? `${doc.documentType} · ${doc.issuingCountryCode} · ${maskValue(doc.documentNumber)} · ${
          doc.manualReviewRequired ? tx(locale, "revue manuelle", "manual review") : "ok"
        }`
      : tx(locale, "Aucun document déposé.", "No document uploaded.");
    const reason = item.reasonCode
      ? kycReasonLabel(
          locale,
          item.status === "ADDITIONAL_INFORMATION_REQUIRED" ||
            item.status === "REJECTED" ||
            item.status === "SUSPENDED" ||
            item.status === "APPROVED"
            ? item.status
            : null,
          item.reasonCode,
        )
      : "";
    const requested =
      parsed.requestedDocumentTypes.length > 0
        ? parsed.requestedDocumentTypes.map((code) => requestableDocumentLabel(locale, code)).join(", ")
        : "";
    const notesParts = [
      reason ? `${tx(locale, "Motif actuel", "Current reason")}: ${reason}` : "",
      parsed.notes ?? "",
      requested ? `${tx(locale, "Documents demandés", "Requested documents")}: ${requested}` : "",
      ownCase
        ? tx(
            locale,
            "Ce dossier vous appartient : un autre membre du personnel doit le décider.",
            "This case is yours: another staff member must decide it.",
          )
        : "",
    ].filter(Boolean);

    return {
      id: item.id,
      searchValue: `${investorName} ${statusLabel} ${documentLabel} ${notesParts.join(" ")}`,
      filterValues: { status: item.status },
      sortValues: {
        investor: investorName,
        status: item.status,
        document: documentLabel,
        notes: notesParts.join(" "),
      },
      cells: {
        investor: <span className="font-semibold">{investorName || "—"}</span>,
        status: statusLabel,
        document: <span className="break-words text-muted">{documentLabel}</span>,
        notes:
          notesParts.length > 0 ? (
            <span className={ownCase ? "break-words text-danger" : "break-words text-muted"}>
              {notesParts.join(" · ")}
            </span>
          ) : (
            "—"
          ),
      },
      actions: (
        <ModalOpenLink
          href={`/admin/kyc?review=${encodeURIComponent(item.id)}`}
          className="inline-flex rounded-full bg-violet px-3 py-1.5 text-xs font-semibold text-white"
        >
          {tx(locale, "Décider", "Review")}
        </ModalOpenLink>
      ),
    };
  });

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

      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucune revue en attente.", "No review waiting.")}
      />

      {reviewId ? (
        <SearchParamValueModal
          param="review"
          clearKeys={["error"]}
          size="lg"
          title={tx(locale, "Décision d'identité", "Identity decision")}
        >
          {!reviewCase ? (
            <p className="text-sm text-muted">{tx(locale, "Dossier introuvable.", "Case not found.")}</p>
          ) : (
            <div className="space-y-3">
              {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
              <p className="text-sm text-muted">
                {reviewProfile?.legalFirstName} {reviewProfile?.legalLastName} ·{" "}
                {kycStatusLabel(locale, reviewCase.status)}
              </p>
              <AdminKycReviewForm
                locale={locale}
                caseId={reviewCase.id}
                ownCase={Boolean(reviewOwnCase)}
                hasPassword={hasPassword}
                ownStaffCode={ownStaffCode}
              />
            </div>
          )}
        </SearchParamValueModal>
      ) : null}
    </div>
  );
}

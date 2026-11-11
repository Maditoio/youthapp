"use client";

import { useMemo, useState } from "react";
import { AdminStepUpField } from "@/components/admin-step-up-field";
import type { AppLocale } from "@/lib/config";
import {
  KYC_REASON_CODES,
  KYC_REVIEW_DECISIONS,
  REQUESTABLE_DOCUMENT_TYPES,
  type KycReviewDecision,
  isKycReviewDecision,
} from "@/lib/kyc-decisions";
import { tx } from "@/lib/i18n/tx";
import { kycDecisionAction } from "@/server/actions";

const field = "h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm text-ink";

export function AdminKycReviewForm({
  locale,
  caseId,
  ownCase,
  hasPassword,
  ownStaffCode,
}: {
  locale: AppLocale;
  caseId: string;
  ownCase: boolean;
  hasPassword: boolean;
  ownStaffCode: string | null;
}) {
  const [decision, setDecision] = useState<KycReviewDecision | "">("");
  const [reason, setReason] = useState("");
  const reasons = useMemo(
    () => (decision ? KYC_REASON_CODES[decision] : []),
    [decision],
  );
  const needsDocs = decision === "ADDITIONAL_INFORMATION_REQUIRED";

  return (
    <form action={kycDecisionAction} className="space-y-3">
      <input type="hidden" name="caseId" value={caseId} />
      <label className="block text-sm font-semibold">
        {tx(locale, "Décision", "Decision")}
        <select
          name="decision"
          required
          disabled={ownCase}
          value={decision}
          onChange={(event) => {
            const next = event.target.value;
            setDecision(isKycReviewDecision(next) ? next : "");
            setReason("");
          }}
          className={`${field} mt-1`}
        >
          <option value="">{tx(locale, "Choisir une décision", "Choose a decision")}</option>
          {KYC_REVIEW_DECISIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {tx(locale, item.fr, item.en)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        {tx(locale, "Motif", "Reason")}
        <select
          name="reason"
          required
          disabled={ownCase || !decision}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={`${field} mt-1`}
        >
          <option value="">
            {decision
              ? tx(locale, "Choisir un motif", "Choose a reason")
              : tx(locale, "Choisir d'abord une décision", "Choose a decision first")}
          </option>
          {reasons.map((item) => (
            <option key={item.code} value={item.code}>
              {tx(locale, item.fr, item.en)}
            </option>
          ))}
        </select>
      </label>
      {needsDocs ? (
        <fieldset className="space-y-2 rounded-2xl border border-border bg-lilac/30 p-3">
          <legend className="px-1 text-sm font-semibold">
            {tx(locale, "Documents demandés", "Requested documents")}
          </legend>
          <p className="text-xs text-muted">
            {tx(
              locale,
              "Sélectionnez au moins un type de document que l'investisseur doit fournir.",
              "Select at least one document type the investor must provide.",
            )}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {REQUESTABLE_DOCUMENT_TYPES.map((item) => (
              <label key={item.code} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="requestedDocs"
                  value={item.code}
                  disabled={ownCase}
                  className="mt-1"
                />
                <span>{tx(locale, item.fr, item.en)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="block text-sm font-semibold">
        {tx(locale, "Notes (optionnelles)", "Notes (optional)")}
        <textarea
          name="notes"
          disabled={ownCase}
          placeholder={tx(
            locale,
            "Notes libres — obligatoires si revue manuelle à l'approbation",
            "Free notes — required when approving a manual-review document",
          )}
          className="mt-1 min-h-20 w-full rounded-2xl border border-border px-3 py-2 text-sm"
        />
      </label>
      <AdminStepUpField
        locale={locale}
        hasPassword={hasPassword}
        ownStaffCode={ownStaffCode}
        className={field}
      />
      <button
        type="submit"
        disabled={ownCase}
        className="rounded-full bg-violet px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {tx(locale, "Enregistrer la décision", "Save decision")}
      </button>
    </form>
  );
}

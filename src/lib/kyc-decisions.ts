import type { AppLocale } from "@/lib/config";
import { DOCUMENT_TYPES } from "@/lib/choices";
import { tx } from "@/lib/i18n/tx";
import type { KycStatus } from "@/server/domain/types";

export type KycReviewDecision = Extract<
  KycStatus,
  "APPROVED" | "REJECTED" | "ADDITIONAL_INFORMATION_REQUIRED" | "SUSPENDED"
>;

export const KYC_REVIEW_DECISIONS = [
  { value: "APPROVED" as const, fr: "Approuver", en: "Approve" },
  {
    value: "ADDITIONAL_INFORMATION_REQUIRED" as const,
    fr: "Demander des documents",
    en: "Request more documents",
  },
  { value: "REJECTED" as const, fr: "Refuser", en: "Reject" },
  { value: "SUSPENDED" as const, fr: "Suspendre", en: "Suspend" },
] as const;

/** Curated reason codes allowed for each KYC review decision. */
export const KYC_REASON_CODES: Record<
  KycReviewDecision,
  readonly { code: string; fr: string; en: string }[]
> = {
  APPROVED: [
    { code: "ID_OK", fr: "Pièce d'identité valide", en: "Valid identity document" },
    { code: "DOCS_SUFFICIENT", fr: "Documents suffisants", en: "Documents sufficient" },
    { code: "MANUAL_CLEARED", fr: "Revue manuelle favorable", en: "Manual review cleared" },
  ],
  ADDITIONAL_INFORMATION_REQUIRED: [
    { code: "ADDRESS_PROOF", fr: "Justificatif de domicile manquant", en: "Proof of address missing" },
    { code: "ID_UNREADABLE", fr: "Pièce illisible ou floue", en: "Document unreadable or blurry" },
    { code: "ID_EXPIRED", fr: "Pièce expirée", en: "Document expired" },
    { code: "SELFIE_REQUIRED", fr: "Selfie avec pièce requis", en: "Selfie with ID required" },
    { code: "SOURCE_OF_FUNDS", fr: "Origine des fonds à justifier", en: "Source of funds needed" },
    { code: "NAME_MISMATCH", fr: "Incohérence de nom", en: "Name mismatch" },
    { code: "OTHER_DOCS", fr: "Autres documents requis", en: "Other documents required" },
  ],
  REJECTED: [
    { code: "FRAUD_SIGNAL", fr: "Signal de fraude", en: "Fraud signal" },
    { code: "SANCTIONS_HIT", fr: "Correspondance sanctions", en: "Sanctions match" },
    { code: "DOC_FORGED", fr: "Document falsifié", en: "Forged document" },
    { code: "UNDERAGE", fr: "Mineur / âge insuffisant", en: "Underage" },
    { code: "POLICY_INELIGIBLE", fr: "Inéligible selon la politique", en: "Ineligible under policy" },
    { code: "OTHER_REJECT", fr: "Autre motif de refus", en: "Other rejection reason" },
  ],
  SUSPENDED: [
    { code: "COMPLIANCE_HOLD", fr: "Gel conformité", en: "Compliance hold" },
    { code: "LEGAL_HOLD", fr: "Gel juridique", en: "Legal hold" },
    { code: "ACCOUNT_RISK", fr: "Risque compte", en: "Account risk" },
  ],
};

/** Document types an officer may request when asking for more information. */
export const REQUESTABLE_DOCUMENT_TYPES = DOCUMENT_TYPES;

const REQUESTED_DOCS_PREFIX = "@@REQUESTED_DOCS:";
const REQUESTED_DOCS_SUFFIX = "@@";

export function isKycReviewDecision(value: string): value is KycReviewDecision {
  return KYC_REVIEW_DECISIONS.some((item) => item.value === value);
}

export function isKycReasonCode(decision: KycReviewDecision, code: string): boolean {
  return KYC_REASON_CODES[decision].some((item) => item.code === code);
}

export function kycDecisionLabel(locale: AppLocale, decision: KycReviewDecision): string {
  const item = KYC_REVIEW_DECISIONS.find((row) => row.value === decision);
  return item ? tx(locale, item.fr, item.en) : decision;
}

export function kycReasonLabel(locale: AppLocale, decision: KycReviewDecision | null, code: string | null): string {
  if (!code) return "";
  if (decision) {
    const item = KYC_REASON_CODES[decision].find((row) => row.code === code);
    if (item) return tx(locale, item.fr, item.en);
  }
  for (const list of Object.values(KYC_REASON_CODES)) {
    const item = list.find((row) => row.code === code);
    if (item) return tx(locale, item.fr, item.en);
  }
  return code;
}

export function requestableDocumentLabel(locale: AppLocale, code: string): string {
  const item = REQUESTABLE_DOCUMENT_TYPES.find((row) => row.code === code);
  return item ? tx(locale, item.fr, item.en) : code;
}

export function isRequestableDocumentType(code: string): boolean {
  return REQUESTABLE_DOCUMENT_TYPES.some((item) => item.code === code);
}

export function encodeKycReviewNotes(notes: string, requestedDocumentTypes: string[]): string | null {
  const docs = requestedDocumentTypes.map((item) => item.trim()).filter(isRequestableDocumentType);
  const body = notes.trim();
  if (docs.length === 0 && !body) return null;
  if (docs.length === 0) return body;
  const header = `${REQUESTED_DOCS_PREFIX}${docs.join(",")}${REQUESTED_DOCS_SUFFIX}`;
  return body ? `${header}\n${body}` : header;
}

export function parseKycReviewNotes(reviewNotes: string | null | undefined): {
  notes: string;
  requestedDocumentTypes: string[];
} {
  if (!reviewNotes) return { notes: "", requestedDocumentTypes: [] };
  const trimmed = reviewNotes.trim();
  if (!trimmed.startsWith(REQUESTED_DOCS_PREFIX)) {
    return { notes: trimmed, requestedDocumentTypes: [] };
  }
  const end = trimmed.indexOf(REQUESTED_DOCS_SUFFIX, REQUESTED_DOCS_PREFIX.length);
  if (end < 0) return { notes: trimmed, requestedDocumentTypes: [] };
  const raw = trimmed.slice(REQUESTED_DOCS_PREFIX.length, end);
  const requestedDocumentTypes = raw
    .split(",")
    .map((item) => item.trim())
    .filter(isRequestableDocumentType);
  const notes = trimmed.slice(end + REQUESTED_DOCS_SUFFIX.length).replace(/^\n/, "").trim();
  return { notes, requestedDocumentTypes };
}

export function kycStatusLabel(locale: AppLocale, status: KycStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return tx(locale, "Non commencé", "Not started");
    case "IN_PROGRESS":
      return tx(locale, "En cours", "In progress");
    case "SUBMITTED":
      return tx(locale, "Soumis", "Submitted");
    case "UNDER_REVIEW":
      return tx(locale, "En revue", "Under review");
    case "ADDITIONAL_INFORMATION_REQUIRED":
      return tx(locale, "Documents complémentaires requis", "Additional documents required");
    case "APPROVED":
      return tx(locale, "Approuvé", "Approved");
    case "REJECTED":
      return tx(locale, "Refusé", "Rejected");
    case "EXPIRED":
      return tx(locale, "Expiré", "Expired");
    case "SUSPENDED":
      return tx(locale, "Suspendu", "Suspended");
    default:
      return status;
  }
}

export function kycStatusTone(status: KycStatus): "violet" | "green" | "amber" | "red" | "slate" {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED" || status === "SUSPENDED") return "red";
  if (status === "ADDITIONAL_INFORMATION_REQUIRED") return "amber";
  if (status === "SUBMITTED" || status === "UNDER_REVIEW") return "violet";
  return "slate";
}

import Link from "next/link";
import { StatusPill } from "@/components/visuals";
import type { AppLocale } from "@/lib/config";
import {
  kycReasonLabel,
  kycStatusLabel,
  kycStatusTone,
  parseKycReviewNotes,
  requestableDocumentLabel,
} from "@/lib/kyc-decisions";
import { tx } from "@/lib/i18n/tx";
import type { KycCase, KycStatus } from "@/server/domain/types";

export function KycStatusCard({
  locale,
  status,
  kyc,
  href = "/investor/onboarding",
  compact = false,
}: {
  locale: AppLocale;
  status: KycStatus;
  kyc?: KycCase | null;
  href?: string;
  compact?: boolean;
}) {
  const parsed = parseKycReviewNotes(kyc?.reviewNotes);
  const reason = kycReasonLabel(
    locale,
    status === "ADDITIONAL_INFORMATION_REQUIRED" ||
      status === "REJECTED" ||
      status === "SUSPENDED" ||
      status === "APPROVED"
      ? status
      : null,
    kyc?.reasonCode ?? null,
  );
  const needsDocs = status === "ADDITIONAL_INFORMATION_REQUIRED";
  const cta = needsDocs
    ? tx(locale, "Déposer des documents", "Upload documents")
    : status === "APPROVED"
      ? tx(locale, "Voir le statut", "View status")
      : tx(locale, "Continuer", "Continue");

  return (
    <article className="min-w-0 overflow-hidden rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <h3 className="min-w-0 truncate font-bold">{tx(locale, "Vérification", "Verification")}</h3>
        <StatusPill tone={kycStatusTone(status)}>{kycStatusLabel(locale, status)}</StatusPill>
      </div>
      <p className="mt-2 break-words text-sm leading-snug text-muted">
        {compact
          ? kycStatusLabel(locale, status)
          : needsDocs
            ? tx(
                locale,
                "Des documents complémentaires sont demandés pour poursuivre la revue.",
                "Additional documents are required to continue the review.",
              )
            : tx(
                locale,
                "Suivez l'état de votre vérification d'identité.",
                "Track your identity verification status.",
              )}
      </p>
      {reason ? (
        <p className="mt-2 break-words text-xs leading-snug text-muted">
          <span className="font-semibold text-ink">{tx(locale, "Motif", "Reason")}: </span>
          {reason}
        </p>
      ) : null}
      {parsed.notes ? (
        <p className="mt-1 line-clamp-3 break-words text-xs leading-snug text-muted">{parsed.notes}</p>
      ) : null}
      {needsDocs && parsed.requestedDocumentTypes.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {parsed.requestedDocumentTypes.map((code) => (
            <li
              key={code}
              className="rounded-2xl bg-lilac/50 px-3 py-2 text-xs font-semibold leading-snug text-ink"
            >
              {requestableDocumentLabel(locale, code)}
            </li>
          ))}
        </ul>
      ) : needsDocs ? (
        <p className="mt-3 text-xs font-semibold text-amber-800">
          {tx(locale, "Consultez la vérification pour les pièces demandées.", "Open verification for the requested documents.")}
        </p>
      ) : null}
      <Link href={href} className="mt-4 inline-block text-sm font-semibold text-link">
        {cta}
      </Link>
    </article>
  );
}

export function RequestedDocumentsPanel({
  locale,
  kyc,
}: {
  locale: AppLocale;
  kyc?: KycCase | null;
}) {
  if (!kyc || kyc.status !== "ADDITIONAL_INFORMATION_REQUIRED") return null;
  const parsed = parseKycReviewNotes(kyc.reviewNotes);
  const reason = kycReasonLabel(locale, "ADDITIONAL_INFORMATION_REQUIRED", kyc.reasonCode);
  return (
    <section className="min-w-0 overflow-hidden rounded-[28px] border border-border bg-white p-4">
      <h2 className="text-base font-bold leading-snug">
        {tx(locale, "Documents demandés", "Requested documents")}
      </h2>
      <p className="mt-1 break-words text-sm leading-snug text-ink/80">
        {tx(
          locale,
          "Fournissez les pièces ci-dessous pour reprendre la revue.",
          "Provide the documents below to resume review.",
        )}
      </p>
      {reason ? (
        <p className="mt-2 break-words text-sm">
          <span className="font-semibold">{tx(locale, "Motif", "Reason")}: </span>
          {reason}
        </p>
      ) : null}
      {parsed.notes ? <p className="mt-1 break-words text-sm text-muted">{parsed.notes}</p> : null}
      {parsed.requestedDocumentTypes.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {parsed.requestedDocumentTypes.map((code) => (
            <li key={code} className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold">
              {requestableDocumentLabel(locale, code)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-semibold">
          {tx(locale, "Le personnel a demandé des documents complémentaires.", "Staff requested additional documents.")}
        </p>
      )}
    </section>
  );
}

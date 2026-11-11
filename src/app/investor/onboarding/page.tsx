import Link from "next/link";
import { redirect } from "next/navigation";
import { KycForm, OnboardingForm } from "@/components/profile-forms";
import { RequestedDocumentsPanel } from "@/components/kyc-status-card";
import { StatusPill } from "@/components/visuals";
import { readGender } from "@/lib/choices";
import { maskValue } from "@/lib/format";
import {
  kycReasonLabel,
  kycStatusLabel,
  kycStatusTone,
  parseKycReviewNotes,
} from "@/lib/kyc-decisions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { isInvestorOnboardingComplete } from "@/server/domain/mutate";
import type { KycStatus } from "@/server/domain/types";

export const dynamic = "force-dynamic";

const steps = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "APPROVED"] as const;

function statusGuidance(status: KycStatus, locale: "fr" | "en") {
  switch (status) {
    case "APPROVED":
      return tx(
        locale,
        "Votre identité est approuvée. Vous pouvez souscrire aux offres éligibles.",
        "Your identity is approved. You can subscribe to eligible offerings.",
      );
    case "REJECTED":
      return tx(
        locale,
        "Votre dossier a été refusé. Consultez le motif ci-dessous. Un nouveau dépôt n'est pas ouvert pour un refus.",
        "Your case was rejected. See the reason below. Uploading again is not open after a rejection.",
      );
    case "ADDITIONAL_INFORMATION_REQUIRED":
      return tx(
        locale,
        "Des documents complémentaires sont demandés. Déposez une nouvelle pièce ci-dessous, puis attendez la revue.",
        "Additional documents are required. Upload a new document below, then wait for review.",
      );
    case "SUSPENDED":
      return tx(
        locale,
        "Votre vérification est suspendue. Contactez le support si besoin.",
        "Your verification is suspended. Contact support if needed.",
      );
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return tx(
        locale,
        "Dossier reçu. Une revue humaine est encore nécessaire — l'envoi n'approuve pas automatiquement.",
        "Case received. A human review is still required — uploading does not auto-approve.",
      );
    default:
      return tx(
        locale,
        "Profil enregistré. Vous pouvez utiliser le portail. La pièce d'identité attend encore une revue humaine.",
        "Profile saved. You can use the portal. Identity documents still wait for a human review.",
      );
  }
}

function progressIndex(status: KycStatus): number {
  if (status === "ADDITIONAL_INFORMATION_REQUIRED") return steps.indexOf("SUBMITTED");
  if (status === "REJECTED" || status === "SUSPENDED") return steps.indexOf("UNDER_REVIEW");
  const index = steps.indexOf(status as (typeof steps)[number]);
  return Math.max(0, index);
}

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  if (!profile) return null;
  const complete = isInvestorOnboardingComplete(session.db, session.user.id);
  const kyc = session.db.kycCases.find((item) => item.investorProfileId === profile.id);
  const docs = session.db.kycDocuments.filter((item) => item.kycCaseId === kyc?.id);
  const status = profile.onboardingStatus;
  const index = progressIndex(status);
  const canUpload =
    !kyc ||
    (kyc.status !== "APPROVED" && kyc.status !== "REJECTED" && kyc.status !== "SUSPENDED");
  const needsMoreDocs = status === "ADDITIONAL_INFORMATION_REQUIRED" || kyc?.status === "ADDITIONAL_INFORMATION_REQUIRED";
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

  if (!complete) {
    return (
      <div className="space-y-4 px-4 md:px-0">
        <h1 className="text-3xl font-bold">{tx(locale, "Compléter le profil", "Complete your profile")}</h1>
        <p className="text-sm text-muted">
          {tx(
            locale,
            "Renseignez votre identité pour continuer. La vérification d'identité reste séparée et n'est pas approuvée automatiquement.",
            "Enter your identity details to continue. Identity verification stays separate and is never auto-approved.",
          )}
        </p>
        <div className="max-w-3xl">
          <OnboardingForm
            locale={locale}
            defaults={{
              firstName: profile.legalFirstName,
              middleName: profile.legalMiddleName,
              lastName: profile.legalLastName,
              phone: session.user.phone ?? "",
              country: profile.countryOfResidence ?? "CD",
              gender: readGender(profile.gender) ?? "",
              language: session.user.preferredLanguage,
              dateOfBirth: profile.dateOfBirth ?? "",
              nationality: profile.nationality ?? "",
              addressLine: profile.addressLine ?? "",
              city: profile.city ?? "",
              taxResidency: profile.taxResidency ?? "",
              taxId: "",
              sourceOfFunds: profile.sourceOfFunds ?? "",
              payoutLabel: profile.payoutLabel ?? "",
              pep: profile.pepStatus === "YES" ? "YES" : "NO",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 md:px-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{tx(locale, "Vérification", "Verification")}</h1>
        <StatusPill tone={kycStatusTone(status)}>{kycStatusLabel(locale, status)}</StatusPill>
      </div>
      <p className="max-w-3xl break-words text-sm leading-relaxed text-muted">{statusGuidance(status, locale)}</p>
      {needsMoreDocs ? <RequestedDocumentsPanel locale={locale} kyc={kyc} /> : null}
      <p>
        <Link href="/investor" className="text-sm font-semibold text-violet">
          {tx(locale, "Aller au tableau de bord", "Go to dashboard")}
        </Link>
        {" · "}
        <Link href="/investor/notifications" className="text-sm font-semibold text-violet">
          {tx(locale, "Notifications", "Notifications")}
        </Link>
        {" · "}
        <Link href="/investor/profile" className="text-sm font-semibold text-violet">
          {tx(locale, "Profil", "Profile")}
        </Link>
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-violet" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>
      {reason || parsed.notes ? (
        <article className="min-w-0 overflow-hidden rounded-[28px] bg-white p-4 shadow-sm">
          {reason ? (
            <p className="break-words text-sm">
              <span className="font-semibold">{tx(locale, "Motif", "Reason")}: </span>
              {reason}
            </p>
          ) : null}
          {parsed.notes ? <p className="mt-1 break-words text-sm text-muted">{parsed.notes}</p> : null}
        </article>
      ) : null}
      <ul className="space-y-2">
        {docs.map((doc) => (
          <li key={doc.id} className="min-w-0 overflow-hidden rounded-[28px] bg-white p-4 text-sm shadow-sm">
            <p className="break-words font-semibold">
              {doc.documentType} · {doc.verificationStatus}
            </p>
            <p className="mt-1 break-words text-muted">
              {doc.issuingCountryCode} · {maskValue(doc.documentNumber)}
              {doc.manualReviewRequired ? ` · ${tx(locale, "revue manuelle", "manual review")}` : ""}
              {doc.rejectionReasonCode ? ` · ${doc.rejectionReasonCode}` : ""}
            </p>
          </li>
        ))}
      </ul>
      {canUpload ? (
        <>
          {needsMoreDocs ? (
            <h2 className="text-xl font-bold">
              {tx(locale, "Déposer des documents complémentaires", "Upload additional documents")}
            </h2>
          ) : null}
          <KycForm
            locale={locale}
            country={profile.countryOfResidence ?? "CD"}
            gender={readGender(profile.gender) ?? ""}
            preferredDocumentTypes={needsMoreDocs ? parsed.requestedDocumentTypes : undefined}
          />
        </>
      ) : null}
    </div>
  );
}

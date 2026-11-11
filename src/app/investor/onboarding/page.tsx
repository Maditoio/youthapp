import Link from "next/link";
import { redirect } from "next/navigation";
import { KycForm, OnboardingForm } from "@/components/profile-forms";
import { readGender } from "@/lib/choices";
import { maskValue } from "@/lib/format";
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
    );
  }

  return (
    <div className="space-y-4 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Vérification", "Verification")}</h1>
      <p className="text-sm text-muted">{statusGuidance(status, locale)}</p>
      {needsMoreDocs ? (
        <p className="rounded-2xl bg-lilac/60 px-4 py-3 text-sm font-semibold text-ink">
          {tx(
            locale,
            "Action requise : fournissez les documents demandés pour reprendre la revue.",
            "Action required: provide the requested documents to resume review.",
          )}
        </p>
      ) : null}
      <p>
        <Link href="/investor" className="text-sm font-semibold text-violet">
          {tx(locale, "Aller au tableau de bord", "Go to dashboard")}
        </Link>
        {" · "}
        <Link href="/investor/notifications" className="text-sm font-semibold text-violet">
          {tx(locale, "Notifications", "Notifications")}
        </Link>
      </p>
      <div className="h-2 rounded-full bg-white">
        <div className="h-full rounded-full bg-violet" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>
      <p className="text-sm">
        {profile.onboardingStatus}
        {kyc ? ` · KYC ${kyc.status}` : ""}
        {kyc?.reasonCode ? ` · ${kyc.reasonCode}` : ""}
      </p>
      {kyc?.reviewNotes ? <p className="text-sm text-muted">{kyc.reviewNotes}</p> : null}
      <ul className="text-sm">
        {docs.map((doc) => (
          <li key={doc.id}>
            {doc.documentType} · {doc.issuingCountryCode} · {maskValue(doc.documentNumber)} · {doc.verificationStatus}
            {doc.manualReviewRequired ? ` · ${tx(locale, "revue manuelle", "manual review")}` : ""}
            {doc.rejectionReasonCode ? ` · ${doc.rejectionReasonCode}` : ""}
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
          <KycForm locale={locale} country={profile.countryOfResidence ?? "CD"} gender={readGender(profile.gender) ?? ""} />
        </>
      ) : null}
    </div>
  );
}

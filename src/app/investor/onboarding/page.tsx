import Link from "next/link";
import { redirect } from "next/navigation";
import { KycForm, OnboardingForm } from "@/components/profile-forms";
import { readGender } from "@/lib/choices";
import { maskValue } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { isInvestorOnboardingComplete } from "@/server/domain/mutate";

export const dynamic = "force-dynamic";

const steps = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "APPROVED"];

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  if (!profile) return null;
  const complete = isInvestorOnboardingComplete(session.db, session.user.id);
  const kyc = session.db.kycCases.find((item) => item.investorProfileId === profile.id);
  const docs = session.db.kycDocuments.filter((item) => item.kycCaseId === kyc?.id);
  const index = Math.max(0, steps.indexOf(profile.onboardingStatus));

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
      <p className="text-sm text-muted">
        {tx(
          locale,
          "Profil enregistré. Vous pouvez utiliser le portail. La pièce d'identité attend encore une revue humaine.",
          "Profile saved. You can use the portal. Identity documents still wait for a human review.",
        )}
      </p>
      <p>
        <Link href="/investor" className="text-sm font-semibold text-violet">
          {tx(locale, "Aller au tableau de bord", "Go to dashboard")}
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
          </li>
        ))}
      </ul>
      <KycForm locale={locale} country={profile.countryOfResidence ?? "CD"} gender={readGender(profile.gender) ?? ""} />
    </div>
  );
}

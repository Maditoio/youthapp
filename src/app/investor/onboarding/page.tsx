import { redirect } from "next/navigation";
import { KycForm } from "@/components/profile-forms";
import { readGender } from "@/lib/choices";
import { maskValue } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

const steps = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "APPROVED"];

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  if (!profile) return null;
  const kyc = session.db.kycCases.find((item) => item.investorProfileId === profile.id);
  const docs = session.db.kycDocuments.filter((item) => item.kycCaseId === kyc?.id);
  const index = Math.max(0, steps.indexOf(profile.onboardingStatus));
  return (
    <div className="space-y-4 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Vérification", "Verification")}</h1>
      <div className="h-2 rounded-full bg-white">
        <div className="h-full rounded-full bg-violet" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>
      <p className="text-sm">{profile.onboardingStatus}{kyc?.reasonCode ? ` · ${kyc.reasonCode}` : ""}</p>
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

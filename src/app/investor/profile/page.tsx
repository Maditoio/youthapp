import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-forms";
import { readGender } from "@/lib/choices";
import { maskValue } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  if (!profile) return null;
  return (
    <div className="space-y-4 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{profile.investorNumber}</h1>
      <p className="text-sm text-muted">{profile.onboardingStatus} · {tx(locale, "Identifiant fiscal masqué", "Tax id masked")} {maskValue(profile.taxId)}</p>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-violet">
        <Link href="/investor/profile/contacts">{tx(locale, "Proches", "Next of kin")}</Link>
        <Link href="/investor/profile/beneficiaries">{tx(locale, "Bénéficiaires", "Beneficiaries")}</Link>
        <Link href="/investor/onboarding">{tx(locale, "Identité", "Identity")}</Link>
      </div>
      <ProfileForm
        locale={locale}
        defaults={{
          firstName: profile.legalFirstName,
          middleName: profile.legalMiddleName,
          lastName: profile.legalLastName,
          phone: session.user.phone ?? "",
          country: profile.countryOfResidence ?? "",
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

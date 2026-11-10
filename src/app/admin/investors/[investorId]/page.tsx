import { notFound } from "next/navigation";
import { genderLabel, readGender } from "@/lib/choices";
import { maskValue } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { holdingQuantity } from "@/server/domain/finance";

export const dynamic = "force-dynamic";

export default async function InvestorDetail({ params }: { params: Promise<{ investorId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const { investorId } = await params;
  const profile = session.db.investorProfiles.find((item) => item.id === investorId);
  if (!profile) notFound();
  const user = session.db.users.find((item) => item.id === profile.userId);
  const subs = session.db.subscriptions.filter((item) => item.investorProfileId === profile.id);
  return (
    <div className="space-y-3 text-sm">
      <h1 className="text-3xl font-bold">{profile.legalFirstName} {profile.legalLastName}</h1>
      <p>{profile.investorNumber} · {profile.onboardingStatus} · {profile.countryOfResidence}</p>
      <p>{tx(locale, "Genre", "Gender")}: {readGender(profile.gender) ? genderLabel(locale, readGender(profile.gender)!) : tx(locale, "Non renseigné", "Not provided")}</p>
      <p>{user?.email} · {maskValue(user?.phone)}</p>
      <p>{tx(locale, "Identifiant fiscal", "Tax id")} {maskValue(profile.taxId)}</p>
      <h2 className="text-xl font-bold">{tx(locale, "Souscriptions", "Subscriptions")}</h2>
      {subs.map((sub) => <p key={sub.id}>{sub.reference} · {sub.status} · {sub.shareQuantity}</p>)}
      <h2 className="text-xl font-bold">{tx(locale, "Actions", "Shares")}</h2>
      {session.db.shareClasses.map((shareClass) => {
        const quantity = holdingQuantity(session.db, profile.id, shareClass.issuerId, shareClass.id);
        return quantity ? <p key={shareClass.id}>{shareClass.className}: {quantity}</p> : null;
      })}
    </div>
  );
}

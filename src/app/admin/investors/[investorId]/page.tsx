import Link from "next/link";
import { notFound } from "next/navigation";
import { genderLabel, readGender } from "@/lib/choices";
import { formatDate, maskValue } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { getStore } from "@/server/db/store";
import { ensureShareCertificates } from "@/server/domain/certificates";
import { holdingQuantity } from "@/server/domain/finance";

export const dynamic = "force-dynamic";

export default async function InvestorDetail({ params }: { params: Promise<{ investorId: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const { investorId } = await params;
  const store = await getStore();
  await store.update((db) => ensureShareCertificates(db, investorId));
  const profile = store.db.investorProfiles.find((item) => item.id === investorId);
  if (!profile) notFound();
  const user = store.db.users.find((item) => item.id === profile.userId);
  const subs = store.db.subscriptions.filter((item) => item.investorProfileId === profile.id);
  const certificates = store.db.shareCertificates.filter(
    (item) => item.investorProfileId === profile.id && item.status === "ACTIVE",
  );
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
      {store.db.shareClasses.map((shareClass) => {
        const quantity = holdingQuantity(store.db, profile.id, shareClass.issuerId, shareClass.id);
        return quantity ? <p key={shareClass.id}>{shareClass.className}: {quantity}</p> : null;
      })}
      <h2 className="text-xl font-bold">{tx(locale, "Titres", "Certificates")}</h2>
      {certificates.length === 0 ? (
        <p>{tx(locale, "Aucun certificat.", "No certificates.")}</p>
      ) : (
        certificates.map((cert) => (
          <p key={cert.id}>
            <Link href={`/verify/certificate/${cert.id}?s=${encodeURIComponent(cert.signature)}`} className="font-semibold text-violet">
              {cert.certificateNumber}
            </Link>
            {" · "}
            {cert.shareQuantity} · {formatDate(cert.allotmentDate, locale)}
          </p>
        ))
      )}
    </div>
  );
}

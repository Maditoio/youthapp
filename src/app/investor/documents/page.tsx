import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  const kyc = session.db.kycCases.find((item) => item.investorProfileId === profile?.id);
  const docs = session.db.kycDocuments.filter((item) => item.kycCaseId === kyc?.id);
  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Documents", "Documents")}</h1>
      {session.db.offeringDocuments.filter((item) => item.visibility === "PUBLIC").map((doc) => (
        <a key={doc.id} href={`/api/documents/${doc.id}`} className="block rounded-[28px] bg-white p-4 font-semibold text-violet">
          {tx(locale, doc.titleFr, doc.titleEn)}
        </a>
      ))}
      {docs.map((doc) => (
        <a key={doc.id} href={`/api/documents/${doc.id}`} className="block rounded-[28px] bg-white p-4 text-sm">
          {doc.documentType} · {doc.verificationStatus}
        </a>
      ))}
      <Link href="/investor/onboarding" className="text-sm font-semibold text-violet">{tx(locale, "Ajouter une pièce", "Add a document")}</Link>
    </div>
  );
}

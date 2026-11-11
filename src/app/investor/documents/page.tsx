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
  const needsMore =
    profile?.onboardingStatus === "ADDITIONAL_INFORMATION_REQUIRED" ||
    kyc?.status === "ADDITIONAL_INFORMATION_REQUIRED";
  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Documents", "Documents")}</h1>
      {needsMore ? (
        <p className="rounded-2xl bg-lilac/60 px-4 py-3 text-sm">
          {tx(
            locale,
            "Le personnel a demandé des documents complémentaires. Ajoutez une pièce depuis la vérification.",
            "Staff requested additional documents. Add a document from verification.",
          )}{" "}
          <Link href="/investor/onboarding" className="font-semibold text-violet">
            {tx(locale, "Ouvrir la vérification", "Open verification")}
          </Link>
        </p>
      ) : null}
      {kyc?.reasonCode || kyc?.reviewNotes ? (
        <p className="text-sm text-muted">
          {kyc.reasonCode ? `${kyc.reasonCode}` : ""}
          {kyc.reviewNotes ? ` · ${kyc.reviewNotes}` : ""}
        </p>
      ) : null}
      {session.db.offeringDocuments.filter((item) => item.visibility === "PUBLIC").map((doc) => (
        <a key={doc.id} href={`/api/documents/${doc.id}`} className="block rounded-[28px] bg-white p-4 font-semibold text-violet">
          {tx(locale, doc.titleFr, doc.titleEn)}
        </a>
      ))}
      {docs.map((doc) => (
        <a key={doc.id} href={`/api/documents/${doc.id}`} className="block rounded-[28px] bg-white p-4 text-sm">
          {doc.documentType} · {doc.verificationStatus}
          {doc.rejectionReasonCode ? ` · ${doc.rejectionReasonCode}` : ""}
        </a>
      ))}
      {kyc && kyc.status !== "APPROVED" && kyc.status !== "REJECTED" && kyc.status !== "SUSPENDED" ? (
        <Link href="/investor/onboarding" className="text-sm font-semibold text-violet">
          {needsMore
            ? tx(locale, "Déposer les documents demandés", "Upload requested documents")
            : tx(locale, "Ajouter une pièce", "Add a document")}
        </Link>
      ) : null}
    </div>
  );
}

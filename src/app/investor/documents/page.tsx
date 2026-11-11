import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestedDocumentsPanel } from "@/components/kyc-status-card";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { kycReasonLabel, parseKycReviewNotes } from "@/lib/kyc-decisions";
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
  const parsed = parseKycReviewNotes(kyc?.reviewNotes);
  const reason = kycReasonLabel(locale, "ADDITIONAL_INFORMATION_REQUIRED", kyc?.reasonCode ?? null);
  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Documents", "Documents")}</h1>
      {needsMore ? <RequestedDocumentsPanel locale={locale} kyc={kyc} /> : null}
      {!needsMore && (kyc?.reasonCode || parsed.notes) ? (
        <p className="min-w-0 max-w-3xl break-words text-sm text-muted">
          {reason || kyc?.reasonCode || ""}
          {parsed.notes ? ` · ${parsed.notes}` : ""}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {session.db.offeringDocuments.filter((item) => item.visibility === "PUBLIC").map((doc) => (
          <a key={doc.id} href={`/api/documents/${doc.id}`} className="block min-w-0 overflow-hidden rounded-[28px] bg-white p-4 font-semibold text-violet">
            <span className="break-words">{tx(locale, doc.titleFr, doc.titleEn)}</span>
          </a>
        ))}
        {docs.map((doc) => (
          <a key={doc.id} href={`/api/documents/${doc.id}`} className="block min-w-0 overflow-hidden rounded-[28px] bg-white p-4 text-sm">
            <span className="break-words">
              {doc.documentType} · {doc.verificationStatus}
              {doc.rejectionReasonCode ? ` · ${doc.rejectionReasonCode}` : ""}
            </span>
          </a>
        ))}
      </div>
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

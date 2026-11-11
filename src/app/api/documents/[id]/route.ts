import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getStore } from "@/server/db/store";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { can } from "@/server/domain/finance";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = (await getStore()).db;
  const locale = await getLocale();
  const offeringDoc = db.offeringDocuments.find((item) => item.id === id);
  if (offeringDoc && offeringDoc.visibility === "PUBLIC") {
    const body = locale === "fr" ? offeringDoc.bodyFr : offeringDoc.bodyEn;
    return new NextResponse(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const kycDoc = db.kycDocuments.find((item) => item.id === id);
  if (!kycDoc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "FORBIDDEN" }, { status: 401 });
  const kyc = db.kycCases.find((item) => item.id === kycDoc.kycCaseId);
  const profile = kyc && db.investorProfiles.find((item) => item.id === kyc.investorProfileId);
  const allowed = profile?.userId === session.user.id || can(session.roles, "kyc.review");
  if (!allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  await (await getStore()).update((draft) => {
    draft.auditLogs.push({
      id: crypto.randomUUID(),
      actorUserId: session.user.id,
      action: "document.access",
      resourceType: "kyc_document",
      resourceId: kycDoc.id,
      reason: "private metadata only",
      createdAt: draft.clock,
    });
  });
  return NextResponse.json({
    storageKey: kycDoc.storageKey,
    documentType: kycDoc.documentType,
    issuingCountry: kycDoc.issuingCountryCode,
    status: kycDoc.verificationStatus,
    note: locale === "fr" ? "Le fichier n'est pas exposé par une URL publique." : "The file is not exposed through a public URL.",
  });
}

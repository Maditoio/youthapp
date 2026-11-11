import { createHmac, timingSafeEqual } from "node:crypto";
import { uid } from "./crypto";
import type { Database, ShareCertificate, ShareIssuance } from "./types";

function signingSecret(): string {
  return (
    process.env.CERTIFICATE_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "jeunese-demo-session-secret-change-me"
  );
}

export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function certificateCanonicalPayload(input: {
  id: string;
  shareIssuanceId: string;
  investorProfileId: string;
  issuerId: string;
  shareClassId: string;
  offeringId: string;
  shareQuantity: number;
  issuePriceMinor: number;
  currencyCode: string;
  allotmentDate: string;
}): string {
  return [
    input.id,
    input.shareIssuanceId,
    input.investorProfileId,
    input.issuerId,
    input.shareClassId,
    input.offeringId,
    String(input.shareQuantity),
    String(input.issuePriceMinor),
    input.currencyCode,
    input.allotmentDate,
  ].join("|");
}

export function signCertificatePayload(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function expectedCertificateSignature(cert: ShareCertificate): string {
  return signCertificatePayload(
    certificateCanonicalPayload({
      id: cert.id,
      shareIssuanceId: cert.shareIssuanceId,
      investorProfileId: cert.investorProfileId,
      issuerId: cert.issuerId,
      shareClassId: cert.shareClassId,
      offeringId: cert.offeringId,
      shareQuantity: cert.shareQuantity,
      issuePriceMinor: cert.issuePriceMinor,
      currencyCode: cert.currencyCode,
      allotmentDate: cert.allotmentDate,
    }),
  );
}

/** True when the stored record is intact and the QR/query signature (when required) matches. */
export function verifyCertificateSignature(
  cert: ShareCertificate,
  provided?: string | null,
  options?: { requireProvided?: boolean },
): boolean {
  const expected = expectedCertificateSignature(cert);
  if (!signaturesMatch(cert.signature, expected)) return false;
  if (options?.requireProvided || (provided != null && provided.length > 0)) {
    if (!provided) return false;
    return signaturesMatch(provided, expected);
  }
  return true;
}

function signaturesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function certificateVerifyPath(certificateId: string, signature: string): string {
  return `/verify/certificate/${certificateId}?s=${encodeURIComponent(signature)}`;
}

export function certificateVerifyUrl(certificateId: string, signature: string): string {
  return `${appBaseUrl()}${certificateVerifyPath(certificateId, signature)}`;
}

function nextCertificateNumber(db: Database): string {
  const seq = db.shareCertificates.length + 1;
  return `CERT-${String(seq).padStart(6, "0")}`;
}

/** Create a certificate for an ISSUED share issuance. No-op if one already exists. */
export function createShareCertificate(db: Database, issuance: ShareIssuance, createdAt = issuance.createdAt): ShareCertificate | null {
  if (issuance.status !== "ISSUED") return null;
  const existing = db.shareCertificates.find((item) => item.shareIssuanceId === issuance.id);
  if (existing) return existing;

  const offering = db.offerings.find((item) => item.id === issuance.offeringId);
  const project = offering ? db.projects.find((item) => item.id === offering.projectId) : null;
  const id = uid();
  const draft = {
    id,
    shareIssuanceId: issuance.id,
    investorProfileId: issuance.investorProfileId,
    issuerId: issuance.issuerId,
    shareClassId: issuance.shareClassId,
    offeringId: issuance.offeringId,
    shareQuantity: issuance.shareQuantity,
    issuePriceMinor: issuance.issuePriceMinor,
    currencyCode: issuance.currencyCode,
    allotmentDate: issuance.allotmentDate,
  };
  const signature = signCertificatePayload(certificateCanonicalPayload(draft));
  const certificate: ShareCertificate = {
    ...draft,
    certificateNumber: nextCertificateNumber(db),
    projectId: project?.id ?? offering?.projectId ?? "",
    registerReference: issuance.registerReference,
    offeringReference: offering ? `${offering.nameEn} (${offering.id})` : issuance.offeringId,
    signature,
    status: "ACTIVE",
    createdAt,
  };
  db.shareCertificates.push(certificate);
  return certificate;
}

/** Backfill certificates for every ISSUED share issuance missing one (optionally scoped to an investor). */
export function ensureShareCertificates(db: Database, investorProfileId?: string): number {
  let created = 0;
  for (const issuance of db.shareIssuances) {
    if (issuance.status !== "ISSUED") continue;
    if (investorProfileId && issuance.investorProfileId !== investorProfileId) continue;
    if (db.shareCertificates.some((item) => item.shareIssuanceId === issuance.id)) continue;
    if (createShareCertificate(db, issuance)) created += 1;
  }
  return created;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { buildCertificateViewModel, ShareCertificateCard } from "@/components/share-certificate-card";
import { Logo } from "@/components/visuals";
import { appConfig } from "@/lib/config";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getStore } from "@/server/db/store";
import { ensureShareCertificates, verifyCertificateSignature } from "@/server/domain/certificates";

export const dynamic = "force-dynamic";

export default async function VerifyCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const locale = await getLocale();
  const { id } = await params;
  const { s } = await searchParams;
  const store = await getStore();
  await store.update((db) => ensureShareCertificates(db));
  const certificate = store.db.shareCertificates.find((item) => item.id === id);
  if (!certificate || certificate.status !== "ACTIVE") notFound();

  const valid = verifyCertificateSignature(certificate, s ?? null, { requireProvided: true });
  const profile = store.db.investorProfiles.find((item) => item.id === certificate.investorProfileId);
  const issuer = store.db.issuers.find((item) => item.id === certificate.issuerId);
  const shareClass = store.db.shareClasses.find((item) => item.id === certificate.shareClassId);
  const project = store.db.projects.find((item) => item.id === certificate.projectId);
  const investorName = profile
    ? [profile.legalFirstName, profile.legalMiddleName, profile.legalLastName].filter(Boolean).join(" ")
    : "—";

  const model = buildCertificateViewModel({
    certificate,
    investorName,
    investorNumber: profile?.investorNumber ?? "—",
    issuerLegalName: issuer?.legalName ?? certificate.issuerId,
    projectTitle: project ? tx(locale, project.titleFr, project.titleEn) : certificate.projectId || "—",
    shareClassName: shareClass?.className ?? certificate.shareClassId,
  });

  return (
    <div className="min-h-dvh bg-canvas px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl space-y-4 print:max-w-none print:space-y-0">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Logo />
          <Link href="/" className="text-sm font-semibold text-violet">
            {appConfig.productName}
          </Link>
        </div>
        <div
          className={[
            "rounded-[24px] px-4 py-3 text-sm font-semibold print:hidden",
            valid ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
          ].join(" ")}
        >
          {valid
            ? tx(locale, "Signature vérifiée — enregistrement authentique Jeunese", "Signature verified — authentic Jeunese record")
            : tx(
                locale,
                "Signature invalide ou absente — ce lien n'a pas pu être authentifié",
                "Invalid or missing signature — this link could not be authenticated",
              )}
        </div>
        <ShareCertificateCard locale={locale} model={model} />
        <p className="text-center text-xs text-muted print:hidden">
          {tx(
            locale,
            "Page publique de vérification des titres numériques Jeunese.",
            "Public verification page for Jeunese digital certificates.",
          )}
        </p>
      </div>
    </div>
  );
}

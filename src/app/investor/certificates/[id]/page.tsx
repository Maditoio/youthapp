import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { buildCertificateViewModel, ShareCertificateCard } from "@/components/share-certificate-card";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { getStore } from "@/server/db/store";
import { ensureShareCertificates } from "@/server/domain/certificates";

export const dynamic = "force-dynamic";

export default async function InvestorCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const { id } = await params;
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  if (!profile) notFound();

  const store = await getStore();
  await store.update((db) => ensureShareCertificates(db, profile.id));
  const certificate = store.db.shareCertificates.find(
    (item) => item.id === id && item.investorProfileId === profile.id && item.status === "ACTIVE",
  );
  if (!certificate) notFound();

  const issuer = store.db.issuers.find((item) => item.id === certificate.issuerId);
  const shareClass = store.db.shareClasses.find((item) => item.id === certificate.shareClassId);
  const project = store.db.projects.find((item) => item.id === certificate.projectId);
  const investorName = [profile.legalFirstName, profile.legalMiddleName, profile.legalLastName]
    .filter(Boolean)
    .join(" ");

  const model = buildCertificateViewModel({
    certificate,
    investorName,
    investorNumber: profile.investorNumber,
    issuerLegalName: issuer?.legalName ?? certificate.issuerId,
    projectTitle: project ? tx(locale, project.titleFr, project.titleEn) : certificate.projectId || "—",
    shareClassName: shareClass?.className ?? certificate.shareClassId,
  });

  return (
    <div className="space-y-4 px-4 pb-10 md:px-0 print:space-y-0 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link href="/investor/profile" className="text-sm font-semibold text-violet">
            ← {tx(locale, "Profil", "Profile")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{tx(locale, "Titre numérique", "Digital certificate")}</h1>
        </div>
        <PrintButton label={tx(locale, "Imprimer", "Print")} />
      </div>
      <ShareCertificateCard locale={locale} model={model} />
    </div>
  );
}

import Link from "next/link";
import { appConfig } from "@/lib/config";
import { formatDate, formatMoney } from "@/lib/format";
import { tx } from "@/lib/i18n/tx";
import type { AppLocale } from "@/lib/config";
import { CertificateQr } from "@/components/certificate-qr";
import { certificateVerifyUrl } from "@/server/domain/certificates";
import type { ShareCertificate } from "@/server/domain/types";

type CertificateViewModel = {
  certificate: ShareCertificate;
  investorName: string;
  investorNumber: string;
  issuerLegalName: string;
  projectTitle: string;
  shareClassName: string;
  verifyUrl?: string;
};

export async function ShareCertificateCard({
  locale,
  model,
  compact = false,
  printHref,
}: {
  locale: AppLocale;
  model: CertificateViewModel;
  compact?: boolean;
  printHref?: string;
}) {
  const { certificate: cert } = model;
  const verifyUrl = model.verifyUrl ?? certificateVerifyUrl(cert.id, cert.signature);
  const consideration = formatMoney(cert.shareQuantity * cert.issuePriceMinor, cert.currencyCode, locale);

  return (
    <article
      className={[
        "relative overflow-hidden border border-violet/20 bg-gradient-to-br from-[#f7f4ff] via-white to-[#efe8ff] text-ink shadow-[var(--shadow-card)]",
        compact ? "rounded-[24px] p-4" : "rounded-[28px] p-5 md:p-7",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#6d4dff]/15" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-[#7a5cff]/10" aria-hidden />

      <header className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet">{appConfig.productName}</p>
          <h2 className={compact ? "mt-1 text-lg font-bold" : "mt-1 text-2xl font-bold tracking-tight"}>
            {tx(locale, "Certificat d'actionnaire", "Shareholder certificate")}
          </h2>
          <p className="mt-1 font-mono text-xs text-muted">{cert.certificateNumber}</p>
        </div>
        {!compact ? (
          <CertificateQr
            url={verifyUrl}
            size={132}
            label={tx(locale, "Scanner pour vérifier", "Scan to verify")}
          />
        ) : null}
      </header>

      <dl className="relative mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <Field label={tx(locale, "Actionnaire", "Shareholder")} value={`${model.investorName} · ${model.investorNumber}`} />
        <Field label={tx(locale, "Émetteur", "Issuer")} value={model.issuerLegalName} />
        <Field label={tx(locale, "Projet", "Project")} value={model.projectTitle} />
        <Field label={tx(locale, "Classe d'actions", "Share class")} value={model.shareClassName} />
        <Field label={tx(locale, "Quantité", "Quantity")} value={String(cert.shareQuantity)} />
        <Field
          label={tx(locale, "Prix d'émission / contrepartie", "Issue price / consideration")}
          value={`${formatMoney(cert.issuePriceMinor, cert.currencyCode, locale)} · ${consideration}`}
        />
        <Field label={tx(locale, "Date d'attribution", "Allotment date")} value={formatDate(cert.allotmentDate, locale)} />
        <Field label={tx(locale, "Référence d'offre", "Offering reference")} value={cert.offeringReference} />
        <Field label={tx(locale, "Référence registre", "Register reference")} value={cert.registerReference} />
        <Field label={tx(locale, "Identifiant certificat", "Certificate id")} value={cert.id} />
      </dl>

      {compact ? (
        <div className="relative mt-4 flex justify-center">
          <CertificateQr url={verifyUrl} size={120} />
        </div>
      ) : null}

      <p className="relative mt-5 text-xs leading-5 text-muted">
        {appConfig.demoMode
          ? tx(
              locale,
              "Enregistrement de plateforme Jeunese (démonstration). Ce document n'est pas un conseil juridique, ni le registre statutaire légal, ni une preuve de titre négociable.",
              "Jeunese platform ownership record (demo). This is not legal advice, not the statutory legal register, and not negotiable title.",
            )
          : tx(
              locale,
              "Enregistrement de propriété sur la plateforme Jeunese. Ce document n'est pas un conseil juridique.",
              "Jeunese platform ownership record. This document is not legal advice.",
            )}
      </p>

      {printHref ? (
        <div className="relative mt-4 flex flex-wrap gap-3 print:hidden">
          <Link href={printHref} className="text-sm font-semibold text-violet underline-offset-2 hover:underline">
            {tx(locale, "Ouvrir / imprimer", "Open / print")}
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/70 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-ink">{value || "—"}</dd>
    </div>
  );
}

export function buildCertificateViewModel(input: {
  certificate: ShareCertificate;
  investorName: string;
  investorNumber: string;
  issuerLegalName: string;
  projectTitle: string;
  shareClassName: string;
}): CertificateViewModel {
  return {
    ...input,
    verifyUrl: certificateVerifyUrl(input.certificate.id, input.certificate.signature),
  };
}

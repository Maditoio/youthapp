import Link from "next/link";
import { Libre_Baskerville } from "next/font/google";
import { appConfig } from "@/lib/config";
import { formatDate, formatMoney } from "@/lib/format";
import { tx } from "@/lib/i18n/tx";
import type { AppLocale } from "@/lib/config";
import { CertificateQr } from "@/components/certificate-qr";
import { certificateVerifyUrl } from "@/server/domain/certificates";
import type { ShareCertificate } from "@/server/domain/types";

const certificateSerif = Libre_Baskerville({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});

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
  const unitPrice = formatMoney(cert.issuePriceMinor, cert.currencyCode, locale);

  return (
    <article
      className={[
        "certificate-paper certificate-print relative bg-[#fcfbfa] text-[#1d1633]",
        compact ? "certificate-sheet--compact" : "certificate-sheet",
      ].join(" ")}
    >
      <div className="certificate-frame" aria-hidden>
        <div className="certificate-frame__outer" />
        <div className="certificate-frame__inner" />
      </div>

      <div className={["relative z-[1] flex h-full flex-col", compact ? "gap-3 p-4 sm:p-5" : "gap-4 p-5 sm:gap-5 sm:p-7 md:p-8"].join(" ")}>
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6d4dff] sm:text-[11px]">
              {appConfig.productName}
            </p>
            <p className={["mt-1 truncate text-[#5a5370]", compact ? "text-xs" : "text-sm"].join(" ")}>
              {model.issuerLegalName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d7694]">
              {tx(locale, "N° certificat", "Certificate no.")}
            </p>
            <p className={["mt-0.5 font-mono font-semibold text-[#1d1633]", compact ? "text-xs" : "text-sm"].join(" ")}>
              {cert.certificateNumber}
            </p>
          </div>
        </header>

        <div className="text-center">
          <div className="mx-auto mb-3 h-px w-16 bg-[#6d4dff]/35 sm:w-24" aria-hidden />
          <h2
            className={[
              certificateSerif.className,
              "font-bold uppercase tracking-[0.14em] text-[#1d1633]",
              compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl md:text-[1.75rem]",
            ].join(" ")}
          >
            {tx(locale, "Certificat d'actions", "Share Certificate")}
          </h2>
          <div className="mx-auto mt-3 h-px w-16 bg-[#c9a227]/70 sm:w-24" aria-hidden />
        </div>

        <div className={["mx-auto max-w-3xl flex-1 text-center", compact ? "space-y-2" : "space-y-3 sm:space-y-4"].join(" ")}>
          <p className={["text-[#5a5370]", compact ? "text-xs" : "text-sm"].join(" ")}>
            {tx(locale, "Certifie que", "This certifies that")}
          </p>
          <p
            className={[
              certificateSerif.className,
              "font-bold leading-tight text-[#1d1633]",
              compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl md:text-[2.15rem]",
            ].join(" ")}
          >
            {model.investorName || "—"}
          </p>
          <p className={["font-mono text-[#7d7694]", compact ? "text-[11px]" : "text-xs sm:text-sm"].join(" ")}>
            {tx(locale, "Investisseur", "Investor")} {model.investorNumber}
          </p>
          <p className={["text-[#5a5370]", compact ? "text-xs" : "text-sm"].join(" ")}>
            {tx(
              locale,
              "est le détenteur enregistré de",
              "is the registered holder of",
            )}
          </p>
          <p
            className={[
              certificateSerif.className,
              "font-bold tracking-wide text-[#6d4dff]",
              compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
            ].join(" ")}
          >
            {cert.shareQuantity.toLocaleString(locale === "fr" ? "fr-CD" : "en-US")}{" "}
            {tx(locale, "actions", "shares")}
          </p>
          <p className={["mx-auto max-w-2xl leading-relaxed text-[#3d3654]", compact ? "text-xs" : "text-sm sm:text-[0.95rem]"].join(" ")}>
            {model.shareClassName}
            <span className="mx-2 text-[#c9a227]" aria-hidden>
              ·
            </span>
            {model.issuerLegalName}
            <span className="mx-2 text-[#c9a227]" aria-hidden>
              ·
            </span>
            {model.projectTitle}
          </p>
        </div>

        <div
          className={[
            "grid gap-x-6 gap-y-3 border-y border-[#e7e2f2] py-3",
            compact ? "grid-cols-2 text-left sm:grid-cols-4" : "grid-cols-2 text-left sm:grid-cols-4",
          ].join(" ")}
        >
          <Meta
            label={tx(locale, "Réf. offre", "Offering ref.")}
            value={cert.offeringReference}
            mono
          />
          <Meta
            label={tx(locale, "Réf. registre", "Register ref.")}
            value={cert.registerReference}
            mono
          />
          <Meta
            label={tx(locale, "Date d'attribution", "Allotment date")}
            value={formatDate(cert.allotmentDate, locale)}
          />
          <Meta
            label={tx(locale, "Prix / contrepartie", "Price / consideration")}
            value={`${unitPrice} · ${consideration}`}
          />
        </div>

        <footer className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 items-end gap-4">
            <CertificateQr
              url={verifyUrl}
              size={compact ? 88 : 112}
              label={tx(locale, "Vérifier", "Verify")}
            />
            <div className="hidden pb-1 sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d7694]">
                {tx(locale, "Authentification", "Authentication")}
              </p>
              <p className={["mt-1 max-w-[14rem] leading-snug text-[#5a5370]", compact ? "text-[11px]" : "text-xs"].join(" ")}>
                {tx(
                  locale,
                  "Scannez le code QR pour confirmer ce titre sur Jeunese.",
                  "Scan the QR code to confirm this certificate on Jeunese.",
                )}
              </p>
            </div>
          </div>
          <CertificateSeal locale={locale} compact={compact} />
        </footer>

        {printHref ? (
          <div className="print:hidden">
            <Link href={printHref} className="text-sm font-semibold text-[#6d4dff] underline-offset-2 hover:underline">
              {tx(locale, "Ouvrir / imprimer", "Open / print")}
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7d7694]">{label}</p>
      <p className={["mt-1 break-words text-sm font-semibold text-[#1d1633]", mono ? "font-mono text-[13px]" : ""].join(" ")}>
        {value || "—"}
      </p>
    </div>
  );
}

function CertificateSeal({ locale, compact }: { locale: AppLocale; compact: boolean }) {
  const size = compact ? 72 : 88;
  return (
    <div className="shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 88 88" className="h-full w-full">
        <circle cx="44" cy="44" r="41" fill="none" stroke="#6d4dff" strokeWidth="1.25" />
        <circle cx="44" cy="44" r="36" fill="none" stroke="#c9a227" strokeWidth="0.9" />
        <circle cx="44" cy="44" r="31" fill="none" stroke="#6d4dff" strokeWidth="0.6" opacity="0.45" />
        <text
          x="44"
          y="40"
          textAnchor="middle"
          fill="#6d4dff"
          fontSize="9"
          fontWeight="700"
          letterSpacing="0.18em"
        >
          JEUNESE
        </text>
        <text x="44" y="54" textAnchor="middle" fill="#7d7694" fontSize="6.5" letterSpacing="0.12em">
          {locale === "fr" ? "ENREGISTRÉ" : "REGISTERED"}
        </text>
      </svg>
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

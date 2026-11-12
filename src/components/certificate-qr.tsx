import QRCode from "qrcode";

/** Server-rendered SVG QR for certificate verification URLs. */
export async function CertificateQr({
  url,
  size = 160,
  label,
}: {
  url: string;
  size?: number;
  label?: string;
}) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: size,
    color: { dark: "#1d1633", light: "#ffffff" },
  });
  return (
    <figure className="inline-flex shrink-0 flex-col items-center gap-1.5 print:gap-1">
      {/*
        Do not fix both width and height to `size` while also applying padding —
        that clipped the SVG on the right/bottom. Let the SVG define size; padding
        expands the white frame around it.
      */}
      <div
        className="bg-white p-1.5 ring-1 ring-[#e7e2f2] [&>svg]:block [&>svg]:h-auto [&>svg]:max-w-none"
        dangerouslySetInnerHTML={{ __html: svg }}
        aria-hidden
      />
      {label ? (
        <figcaption className="max-w-[10rem] text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7d7694]">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}

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
    color: { dark: "#1a1228", light: "#ffffff" },
  });
  return (
    <figure className="inline-flex shrink-0 flex-col items-center gap-2 print:gap-1">
      {/*
        Do not fix both width and height to `size` while also applying padding —
        that clipped the SVG on the right/bottom. Let the SVG define size; padding
        expands the white frame around it.
      */}
      <div
        className="overflow-hidden rounded-2xl bg-white p-2 shadow-sm [&>svg]:block [&>svg]:h-auto [&>svg]:max-w-none"
        dangerouslySetInnerHTML={{ __html: svg }}
        aria-hidden
      />
      {label ? (
        <figcaption className="max-w-[12rem] text-center text-[10px] leading-4 text-muted">{label}</figcaption>
      ) : null}
    </figure>
  );
}

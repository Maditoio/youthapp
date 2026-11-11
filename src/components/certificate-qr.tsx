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
    <figure className="inline-flex flex-col items-center gap-2">
      <div
        className="overflow-hidden rounded-2xl bg-white p-2 shadow-sm [&_svg]:block"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: svg }}
        aria-hidden
      />
      {label ? <figcaption className="max-w-[12rem] text-center text-[10px] leading-4 text-muted">{label}</figcaption> : null}
    </figure>
  );
}

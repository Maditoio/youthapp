import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import { PwaRegister } from "@/components/pwa-register";
import { appConfig } from "@/lib/config";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Jeunese",
    template: "%s · Jeunese",
  },
  description:
    "Plateforme d'investissement en actions pour les citoyens congolais.",
  applicationName: appConfig.productName,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: appConfig.productName,
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#15352E",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <html lang={locale}>
      <body className={`${plusJakarta.variable} antialiased`}>
        <DemoModeBanner message={dict.common.demoBanner} />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}

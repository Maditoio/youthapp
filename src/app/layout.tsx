import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { AppProviders } from "@/components/app-providers";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import { FlashToaster } from "@/components/flash-toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { MotionRoot } from "@/components/motion";
import { PwaRegister } from "@/components/pwa-register";
import { appConfig } from "@/lib/config";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { themeInitScript } from "@/lib/theme";
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
  themeColor: "#6D4DFF",
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
    <html lang={locale} suppressHydrationWarning>
      <body className={`${plusJakarta.variable} antialiased`}>
        <Script id="jeunese-theme" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <AppProviders clerk={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}>
          <ThemeProvider>
            <ToastProvider locale={locale}>
              <DemoModeBanner message={dict.common.demoBanner} />
              <MotionRoot>{children}</MotionRoot>
              <Suspense fallback={null}>
                <FlashToaster locale={locale} />
              </Suspense>
              <PwaRegister />
            </ToastProvider>
          </ThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}

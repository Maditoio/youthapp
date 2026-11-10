import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import type { AppLocale } from "@/lib/config";

export function ProsePage({
  locale,
  title,
  returnTo,
  children,
}: {
  locale: AppLocale;
  title: string;
  returnTo: string;
  children: ReactNode;
}) {
  return (
    <div>
      <SiteHeader returnTo={returnTo} />
      <main className="mx-auto max-w-3xl px-4">
        <h1 className="text-4xl font-bold">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-ink">{children}</div>
        <p className="mt-8 text-sm">
          <Link href="/projects" className="font-semibold text-violet">
            {locale === "fr" ? "Voir les projets" : "See projects"}
          </Link>
        </p>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

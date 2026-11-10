import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";

/** Optional issuer workspace shell — features deferred to Milestone 8. */
export default async function IssuerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <div className="bg-surface-muted flex min-h-dvh flex-col">
      <header className="border-border bg-surface flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-brand-forest font-bold">
            {dict.common.productName}
          </Link>
          <span className="text-text-secondary text-sm">{dict.nav.issuer}</span>
        </div>
        <LanguageSwitcher
          locale={locale}
          labels={{
            language: dict.common.language,
            french: dict.common.french,
            english: dict.common.english,
          }}
          returnTo="/issuer"
        />
      </header>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}

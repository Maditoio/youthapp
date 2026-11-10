import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <div className="bg-surface-muted flex min-h-dvh">
      <aside className="border-border bg-brand-forest hidden w-64 shrink-0 border-r p-4 text-[var(--text-on-forest)] md:block">
        <Link href="/" className="mb-8 block text-lg font-bold">
          {dict.common.productName}
        </Link>
        <p className="text-brand-copper mb-4 text-xs tracking-wider uppercase">
          {dict.nav.admin}
        </p>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            href="/admin"
            className="rounded-[var(--radius-md)] px-3 py-2 hover:bg-white/10"
          >
            {dict.nav.dashboard}
          </Link>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-surface flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-brand-forest font-semibold">
            {dict.admin.title}
          </h1>
          <LanguageSwitcher
            locale={locale}
            labels={{
              language: dict.common.language,
              french: dict.common.french,
              english: dict.common.english,
            }}
            returnTo="/admin"
          />
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

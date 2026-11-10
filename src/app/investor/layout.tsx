import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";

export default async function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <div className="bg-surface-muted flex min-h-dvh flex-col md:flex-row">
      <aside className="border-border bg-surface hidden w-60 shrink-0 border-r p-4 md:block">
        <Link
          href="/"
          className="text-brand-forest mb-8 block text-lg font-bold"
        >
          {dict.common.productName}
        </Link>
        <nav className="text-text-secondary flex flex-col gap-2 text-sm font-medium">
          <Link
            href="/investor"
            className="hover:bg-surface-muted hover:text-text-primary rounded-[var(--radius-md)] px-3 py-2"
          >
            {dict.nav.dashboard}
          </Link>
          <Link
            href="/investor"
            className="hover:bg-surface-muted hover:text-text-primary rounded-[var(--radius-md)] px-3 py-2"
          >
            {dict.nav.projects}
          </Link>
          <Link
            href="/investor"
            className="hover:bg-surface-muted hover:text-text-primary rounded-[var(--radius-md)] px-3 py-2"
          >
            {dict.nav.portfolio}
          </Link>
          <Link
            href="/investor"
            className="hover:bg-surface-muted hover:text-text-primary rounded-[var(--radius-md)] px-3 py-2"
          >
            {dict.nav.profile}
          </Link>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-surface flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-brand-forest text-base font-semibold md:text-lg">
            {dict.investor.title}
          </h1>
          <LanguageSwitcher
            locale={locale}
            labels={{
              language: dict.common.language,
              french: dict.common.french,
              english: dict.common.english,
            }}
            returnTo="/investor"
          />
        </header>
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
        <nav
          aria-label="Investor"
          className="border-border bg-surface fixed inset-x-0 bottom-0 z-10 flex border-t md:hidden"
        >
          {[
            { href: "/investor", label: dict.nav.dashboard },
            { href: "/investor", label: dict.nav.projects },
            { href: "/investor", label: dict.nav.portfolio },
            { href: "/investor", label: dict.nav.profile },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-text-secondary flex flex-1 flex-col items-center py-3 text-xs font-medium"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

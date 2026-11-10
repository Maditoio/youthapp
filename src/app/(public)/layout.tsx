import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { authAdapter } from "@/lib/auth/adapter";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const signInUrl = authAdapter.getSignInUrl();
  const signUpUrl = authAdapter.getSignUpUrl();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border bg-surface border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/"
            className="text-brand-forest text-xl font-bold tracking-tight"
          >
            {dict.common.productName}
          </Link>
          <nav className="text-text-secondary hidden items-center gap-6 text-sm font-medium sm:flex">
            <Link href="/" className="hover:text-text-primary">
              {dict.nav.home}
            </Link>
            <Link href="/#projects" className="hover:text-text-primary">
              {dict.nav.projects}
            </Link>
            <Link href="/#learn" className="hover:text-text-primary">
              {dict.nav.learn}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher
              locale={locale}
              labels={{
                language: dict.common.language,
                french: dict.common.french,
                english: dict.common.english,
              }}
              returnTo="/"
            />
            <Link href={signInUrl} className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">
                {dict.common.signIn}
              </Button>
            </Link>
            <Link href={signUpUrl}>
              <Button size="sm">{dict.common.signUp}</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-border bg-surface text-text-secondary border-t px-4 py-8 text-center text-sm">
        <p className="text-text-primary font-semibold">
          {dict.common.productName}
        </p>
        <p className="mt-1">{dict.common.brandLine}</p>
      </footer>
    </div>
  );
}

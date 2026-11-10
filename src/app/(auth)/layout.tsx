import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex w-full max-w-md items-center justify-between">
        <Link
          href="/"
          className="text-brand-forest text-xl font-bold tracking-tight"
        >
          {dict.common.productName}
        </Link>
        <LanguageSwitcher
          locale={locale}
          labels={{
            language: dict.common.language,
            french: dict.common.french,
            english: dict.common.english,
          }}
          returnTo="/sign-in"
        />
      </div>
      <div className="border-border bg-surface w-full max-w-md rounded-[var(--radius-lg)] border p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}

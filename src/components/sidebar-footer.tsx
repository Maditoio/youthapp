import { LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";

export function SidebarFooter({ locale, returnTo }: { locale: AppLocale; returnTo: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <LanguageSwitcher
        locale={locale}
        labels={{ language: tx(locale, "Langue", "Language"), french: "FR", english: "EN" }}
        returnTo={returnTo}
      />
      <SignOutButton className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:bg-lilac hover:text-ink disabled:opacity-60">
        <LogOut className="h-4 w-4" aria-hidden />
        {tx(locale, "Sortir", "Sign out")}
      </SignOutButton>
    </div>
  );
}

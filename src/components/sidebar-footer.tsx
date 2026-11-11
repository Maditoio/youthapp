import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";

export function SidebarFooter({
  locale,
  settingsHref,
}: {
  locale: AppLocale;
  /** When set, shows a single Settings link beside Sign out. */
  settingsHref?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {settingsHref ? (
        <Link
          href={settingsHref}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:bg-lilac hover:text-ink"
        >
          <Settings className="h-4 w-4" aria-hidden />
          {tx(locale, "Réglages", "Settings")}
        </Link>
      ) : null}
      <SignOutButton
        className={
          settingsHref
            ? "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:bg-lilac hover:text-ink disabled:opacity-60"
            : "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:bg-lilac hover:text-ink disabled:opacity-60"
        }
      >
        <LogOut className="h-4 w-4" aria-hidden />
        {tx(locale, "Sortir", "Sign out")}
      </SignOutButton>
    </div>
  );
}

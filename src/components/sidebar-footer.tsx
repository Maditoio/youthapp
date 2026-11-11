import { LogOut } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";

/** Shell footer under the user email — Sign out only. Settings lives in the nav list. */
export function SidebarFooter({ locale }: { locale: AppLocale }) {
  return (
    <SignOutButton className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:bg-lilac hover:text-ink disabled:opacity-60">
      <LogOut className="h-4 w-4" aria-hidden />
      {tx(locale, "Sortir", "Sign out")}
    </SignOutButton>
  );
}

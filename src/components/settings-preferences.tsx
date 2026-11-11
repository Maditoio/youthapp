"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTheme } from "@/components/theme-provider";
import type { AppLocale } from "@/lib/config";
import type { ThemePreference } from "@/lib/theme";
import { tx } from "@/lib/i18n/tx";
import { cn } from "@/lib/utils";

type SettingsPreferencesProps = {
  locale: AppLocale;
  returnTo: string;
  /** Extra content after Appearance + Language (e.g. admin demo reset). */
  children?: ReactNode;
};

const themeOptions: { value: ThemePreference; icon: typeof Sun; fr: string; en: string }[] = [
  { value: "system", icon: Monitor, fr: "Système", en: "System" },
  { value: "light", icon: Sun, fr: "Clair", en: "Light" },
  { value: "dark", icon: Moon, fr: "Sombre", en: "Dark" },
];

export function SettingsPreferences({ locale, returnTo, children }: SettingsPreferencesProps) {
  const { preference, setPreference } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold text-ink">{tx(locale, "Apparence", "Appearance")}</h2>
          <p className="mt-1 text-sm text-muted">
            {tx(
              locale,
              "Le mode sombre suit le système jusqu’à ce que vous choisissiez Clair ou Sombre.",
              "Dark mode follows your system until you choose Light or Dark.",
            )}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4" role="radiogroup" aria-label={tx(locale, "Thème", "Theme")}>
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const selected = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPreference(option.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-sm font-semibold transition-colors",
                  selected
                    ? "border-violet bg-lilac text-violet"
                    : "border-border bg-surface text-ink hover:bg-surface-muted",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {tx(locale, option.fr, option.en)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold text-ink">{tx(locale, "Langue", "Language")}</h2>
          <p className="mt-1 text-sm text-muted">
            {tx(locale, "Français et anglais pour toute l’application.", "French and English across the app.")}
          </p>
        </div>
        <div className="px-5 py-4">
          <LanguageSwitcher
            locale={locale}
            labels={{ language: tx(locale, "Langue", "Language"), french: "FR", english: "EN" }}
            returnTo={returnTo}
          />
        </div>
      </section>

      {children}
    </div>
  );
}

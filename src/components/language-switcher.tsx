import { setLocale } from "@/lib/i18n/set-locale";
import type { AppLocale } from "@/lib/config";
import { Button } from "@/components/ui/button";

type LanguageSwitcherProps = {
  locale: AppLocale;
  labels: { language: string; french: string; english: string };
  returnTo: string;
};

export function LanguageSwitcher({
  locale,
  labels,
  returnTo,
}: LanguageSwitcherProps) {
  return (
    <div className="flex items-center gap-2" aria-label={labels.language}>
      <form action={setLocale}>
        <input type="hidden" name="locale" value="fr" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button
          type="submit"
          variant={locale === "fr" ? "primary" : "ghost"}
          size="sm"
          aria-pressed={locale === "fr"}
        >
          {labels.french}
        </Button>
      </form>
      <form action={setLocale}>
        <input type="hidden" name="locale" value="en" />
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button
          type="submit"
          variant={locale === "en" ? "primary" : "ghost"}
          size="sm"
          aria-pressed={locale === "en"}
        >
          {labels.english}
        </Button>
      </form>
    </div>
  );
}

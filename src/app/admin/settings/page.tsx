import { SettingsPreferences } from "@/components/settings-preferences";
import { SubmitButton } from "@/components/ui/submit-button";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { resetDemoAction } from "@/server/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const locale = await getLocale();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-ink">{tx(locale, "Réglages", "Settings")}</h1>
        <p className="mt-1 text-sm text-muted">
          {tx(locale, "Apparence, langue et outils de démonstration.", "Appearance, language, and demonstration tools.")}
        </p>
      </div>
      <SettingsPreferences locale={locale} returnTo="/admin/settings">
        <section className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-bold text-ink">{tx(locale, "Démonstration", "Demonstration")}</h2>
            <p className="mt-1 text-sm text-muted">
              {tx(
                locale,
                "La réinitialisation reconstruit uniquement les données fictives de cette machine.",
                "Reset rebuilds only the fictional data on this machine.",
              )}
            </p>
          </div>
          <div className="px-5 py-4">
            <form action={resetDemoAction}>
              <SubmitButton size="sm">{tx(locale, "Réinitialiser la démonstration", "Reset demonstration")}</SubmitButton>
            </form>
          </div>
        </section>
      </SettingsPreferences>
    </div>
  );
}

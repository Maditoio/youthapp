import { SettingsPreferences } from "@/components/settings-preferences";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function IssuerSettingsPage() {
  const locale = await getLocale();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-ink">{tx(locale, "Réglages", "Settings")}</h1>
        <p className="mt-1 text-sm text-muted">
          {tx(locale, "Apparence, langue et préférences du compte.", "Appearance, language, and account preferences.")}
        </p>
      </div>
      <SettingsPreferences locale={locale} returnTo="/issuer/settings" />
    </div>
  );
}

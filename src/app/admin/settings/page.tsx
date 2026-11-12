import { SettingsPreferences } from "@/components/settings-preferences";
import { SubmitButton } from "@/components/ui/submit-button";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { resetDemoAction } from "@/server/actions";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const locale = await getLocale();
  const session = await getSession();
  const ownStaff = session
    ? session.db.staffProfiles.find((item) => item.userId === session.user.id && item.status === "ACTIVE")
    : null;
  const canResetDemo = session?.roles.includes("platform_admin") ?? false;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-ink">{tx(locale, "Réglages", "Settings")}</h1>
        <p className="mt-1 text-sm text-muted">
          {tx(
            locale,
            "Apparence, langue, sécurité personnelle et outils de démonstration.",
            "Appearance, language, personal security, and demonstration tools.",
          )}
        </p>
      </div>
      <SettingsPreferences locale={locale} returnTo="/admin/settings">
        {ownStaff ? (
          <section className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-bold text-ink">
                {tx(locale, "Ma sécurité", "My security")}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {tx(
                  locale,
                  "Votre code de confirmation personnel. Il n'est visible que pour vous (et une seule fois pour un administrateur plateforme à la création ou à la régénération).",
                  "Your personal confirmation code. Only you can see it here (a platform admin sees a new code once when creating or rotating).",
                )}
              </p>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {tx(locale, "Numéro de personnel", "Staff number")}
                </p>
                <p className="mt-1 font-semibold text-ink">{ownStaff.staffNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {tx(locale, "Code de confirmation", "Confirmation code")}
                </p>
                <p className="mt-1 font-mono text-xl tracking-[0.35em] text-violet">{ownStaff.mfaCodeDisplay}</p>
              </div>
            </div>
          </section>
        ) : null}
        {canResetDemo ? (
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
        ) : null}
      </SettingsPreferences>
    </div>
  );
}

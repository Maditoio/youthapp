import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";

/** Sensitive-action confirmation: account password when set, otherwise staff MFA / step-up code. */
export function AdminStepUpField({
  locale,
  hasPassword,
  ownStaffCode,
  className,
}: {
  locale: AppLocale;
  hasPassword: boolean;
  /** Logged-in staff member's own confirmation code (never another person's). */
  ownStaffCode?: string | null;
  className?: string;
}) {
  if (hasPassword) {
    return (
      <div className="space-y-1">
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder={tx(locale, "Mot de passe du compte", "Account password")}
          className={className}
        />
        <p className="text-xs text-muted">
          {tx(
            locale,
            "Confirmation d'étape : le mot de passe de ce compte (démonstration : Demo-Jeunese-2026).",
            "Step-up confirmation: this account's password (demo: Demo-Jeunese-2026).",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <input
        name="password"
        type="password"
        required
        autoComplete="one-time-code"
        inputMode="numeric"
        placeholder={tx(locale, "Code personnel staff", "Staff confirmation code")}
        className={className}
      />
      <p className="text-xs text-muted">
        {ownStaffCode
          ? tx(
              locale,
              `Ce compte n'a pas de mot de passe local. Votre code personnel : ${ownStaffCode} (aussi dans Réglages → Ma sécurité).`,
              `This account has no local password. Your staff confirmation code: ${ownStaffCode} (also under Settings → My security).`,
            )
          : tx(
              locale,
              "Ce compte n'a pas de mot de passe local. Saisissez votre code personnel (Réglages → Ma sécurité).",
              "This account has no local password. Enter your staff confirmation code (Settings → My security).",
            )}
      </p>
    </div>
  );
}

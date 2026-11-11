import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";

/** Sensitive-action confirmation: account password when set, otherwise staff MFA / step-up code. */
export function AdminStepUpField({
  locale,
  hasPassword,
  className,
}: {
  locale: AppLocale;
  hasPassword: boolean;
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
        {tx(
          locale,
          "Ce compte Clerk n'a pas de mot de passe local. Saisissez le code personnel staff (démonstration : 482913).",
          "This Clerk account has no local password. Enter the staff confirmation code (demo: 482913).",
        )}
      </p>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { googleDemoAction, mfaAction, signInAction, signUpAction, verifyEmailAction } from "@/server/actions";
import { CountrySelect, GenderSelect } from "@/components/choice-fields";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/config";
import { errorCopy } from "@/server/domain/errors";
import { tx } from "@/lib/i18n/tx";

const field = "h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm";

export function SignInForm({ locale }: { locale: AppLocale }) {
  const [state, action, pending] = useActionState(signInAction, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-semibold">
        {tx(locale, "E-mail", "Email")}
        <input name="email" type="email" required className={`${field} mt-1`} defaultValue="amina@demo.jeunese.test" />
      </label>
      <label className="block text-sm font-semibold">
        {tx(locale, "Mot de passe", "Password")}
        <input name="password" type="password" required className={`${field} mt-1`} defaultValue="Demo-Jeunese-2026" />
      </label>
      {state.error ? <p className="text-sm text-danger">{errorCopy[state.error]?.[locale] ?? state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {tx(locale, "Se connecter", "Sign in")}
      </Button>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          ["amina@demo.jeunese.test", tx(locale, "Investisseur", "Investor")],
          ["admin@demo.jeunese.test", tx(locale, "Admin", "Admin")],
          ["issuer@demo.jeunese.test", tx(locale, "Émetteur", "Issuer")],
        ].map(([email, label]) => (
          <button
            key={email}
            type="button"
            className="rounded-2xl bg-lilac px-2 py-2 font-semibold text-violet"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (!form) return;
              const input = form.elements.namedItem("email");
              if (input instanceof HTMLInputElement) input.value = email;
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        {tx(locale, "Mot de passe démo pour tous les comptes : Demo-Jeunese-2026. Le personnel doit ensuite saisir le code 482913.", "Demo password for every account: Demo-Jeunese-2026. Staff then enter code 482913.")}
      </p>
      <button formAction={googleDemoAction} className="h-12 w-full rounded-full border border-border text-sm font-semibold">
        {tx(locale, "Continuer avec Google (bac à sable)", "Continue with Google (sandbox)")}
      </button>
    </form>
  );
}

export function SignUpForm({ locale }: { locale: AppLocale }) {
  const [state, action, pending] = useActionState(signUpAction, {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input name="firstName" required placeholder={tx(locale, "Prénom", "First name")} className={field} />
        <input name="lastName" required placeholder={tx(locale, "Nom", "Last name")} className={field} />
      </div>
      <input name="email" type="email" required placeholder={tx(locale, "E-mail", "Email")} className={field} />
      <input name="phone" required placeholder="+243812345678" className={field} />
      <input name="password" type="password" required minLength={10} placeholder={tx(locale, "Mot de passe", "Password")} className={field} />
      <label className="block text-sm font-semibold">
        {tx(locale, "Pays de résidence", "Country of residence")}
        <CountrySelect locale={locale} name="country" defaultValue="CD" required className="mt-1" />
      </label>
      <label className="block text-sm font-semibold">
        {tx(locale, "Genre", "Gender")}
        <GenderSelect locale={locale} required className="mt-1" />
      </label>
      <label className="block text-sm font-semibold">
        {tx(locale, "Date de naissance", "Date of birth")}
        <DatePicker locale={locale} name="dateOfBirth" required className="mt-1" />
      </label>
      <select name="language" className={field} defaultValue={locale}>
        <option value="fr">Français</option>
        <option value="en">English</option>
      </select>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" className="mt-1" required />
        {tx(locale, "J'accepte les conditions de démonstration et la notice de confidentialité.", "I accept the demonstration terms and the privacy notice.")}
      </label>
      {state.error ? <p className="text-sm text-danger">{errorCopy[state.error]?.[locale] ?? state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {tx(locale, "Créer le compte", "Create account")}
      </Button>
    </form>
  );
}

export function VerifyForm({ locale, email, demoCode }: { locale: AppLocale; email: string; demoCode: string | null }) {
  const [state, action, pending] = useActionState(verifyEmailAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="email" value={email} />
      <p className="text-sm text-muted">{email}</p>
      {demoCode ? (
        <p className="rounded-2xl bg-lilac p-3 text-sm">
          {tx(locale, "Code de démonstration (aucun e-mail n'est envoyé) :", "Demonstration code (no email is sent):")} <strong>{demoCode}</strong>
        </p>
      ) : null}
      <input name="code" inputMode="numeric" required className={field} placeholder="000000" />
      {state.error ? <p className="text-sm text-danger">{errorCopy[state.error]?.[locale] ?? state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {tx(locale, "Vérifier", "Verify")}
      </Button>
    </form>
  );
}

export function MfaForm({ locale }: { locale: AppLocale }) {
  const [state, action, pending] = useActionState(mfaAction, {});
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted">
        {tx(locale, "Code personnel de démonstration : 482913. En production, ce serait une application d'authentification.", "Demonstration staff code: 482913. In production this would be an authenticator app.")}
      </p>
      <input name="code" required className={field} defaultValue="482913" />
      {state.error ? <p className="text-sm text-danger">{errorCopy[state.error]?.[locale] ?? state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {tx(locale, "Confirmer", "Confirm")}
      </Button>
    </form>
  );
}

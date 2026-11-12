"use client";

import { useActionState, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import {
  googleDemoAction,
  mfaAction,
  signInAction,
  signUpAction,
  verifyEmailAction,
  type ClerkBindProfile,
} from "@/server/actions";
import { CountrySelect, GenderSelect } from "@/components/choice-fields";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { useActionFeedback } from "@/components/use-action-feedback";
import { clerkContinueHref } from "@/lib/auth/clerk-continue";
import type { AppLocale } from "@/lib/config";
import { errorCopy } from "@/server/domain/errors";
import { tx } from "@/lib/i18n/tx";

const field = "h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm";

/** Full navigation so Clerk session cookies are present when the server binds Jeunese. */
function continueToJeunese() {
  window.location.assign(clerkContinueHref());
}

/** Clerk errors arrive as raw strings; surface each one as a toast too. */
function useErrorToast(error: string) {
  const { toast } = useToast();
  useEffect(() => {
    if (error) toast({ variant: "error", title: error });
  }, [error, toast]);
}

export function SignInForm({ locale, useClerk = false }: { locale: AppLocale; useClerk?: boolean }) {
  if (useClerk) return <ClerkSignInForm locale={locale} />;
  return <DemoSignInForm locale={locale} />;
}

function DemoSignInForm({ locale }: { locale: AppLocale }) {
  const [state, action] = useActionState(signInAction, {});
  useActionFeedback(state, locale);
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
      <SubmitButton name="intent" value="password" className="w-full">
        {tx(locale, "Se connecter", "Sign in")}
      </SubmitButton>
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
        {tx(locale, "Mot de passe démo pour tous les comptes : Demo-Jeunese-2026. Le personnel saisit ensuite son code personnel (visible dans Réglages → Ma sécurité).", "Demo password for every account: Demo-Jeunese-2026. Staff then enter their personal code (visible under Settings → My security).")}
      </p>
      <SubmitButton formAction={googleDemoAction} variant="secondary" size="lg" className="w-full text-sm">
        {tx(locale, "Continuer avec Google (bac à sable)", "Continue with Google (sandbox)")}
      </SubmitButton>
    </form>
  );
}

function ClerkSignInForm({ locale }: { locale: AppLocale }) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  useErrorToast(error);

  useEffect(() => {
    if (authLoaded && isSignedIn) continueToJeunese();
  }, [authLoaded, isSignedIn]);

  async function onSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!isLoaded || !signIn) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const result = await signIn.create({
        identifier: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      });
      if (result.status !== "complete" || !result.createdSessionId) {
        setError(tx(locale, "Connexion incomplète. Terminez la vérification demandée par Clerk.", "Sign-in is incomplete. Finish the verification Clerk asked for."));
        setPending(false);
        return;
      }
      await setActive({ session: result.createdSessionId });
      continueToJeunese();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "INVALID_CREDENTIALS");
      setPending(false);
    }
  }

  if (authLoaded && isSignedIn) {
    return (
      <p className="text-sm text-muted">
        {tx(locale, "Session Clerk détectée — ouverture de Jeunese…", "Clerk session found — opening Jeunese…")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="email" type="email" required autoComplete="email" placeholder={tx(locale, "E-mail", "Email")} className={field} />
      <input name="password" type="password" required autoComplete="current-password" placeholder={tx(locale, "Mot de passe", "Password")} className={field} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" className="w-full" loading={pending} disabled={!isLoaded || redirecting}>
        {tx(locale, "Se connecter", "Sign in")}
      </Button>
      <Button
        variant="secondary"
        size="lg"
        className="w-full text-sm"
        loading={redirecting}
        disabled={!isLoaded || pending}
        onClick={() => {
          setRedirecting(true);
          signIn
            ?.authenticateWithRedirect({
              strategy: "oauth_google",
              redirectUrl: "/sign-in/sso-callback",
              redirectUrlComplete: clerkContinueHref(),
            })
            .catch((caught: unknown) => {
              setRedirecting(false);
              setError(caught instanceof Error ? caught.message : "INVALID_STATE");
            });
        }}
      >
        {tx(locale, "Continuer avec Google", "Continue with Google")}
      </Button>
    </form>
  );
}

export function SignUpForm({ locale, useClerk = false }: { locale: AppLocale; useClerk?: boolean }) {
  if (useClerk) return <ClerkSignUpForm locale={locale} />;
  return <DemoSignUpForm locale={locale} />;
}

function DemoSignUpForm({ locale }: { locale: AppLocale }) {
  const [state, action] = useActionState(signUpAction, {});
  useActionFeedback(state, locale);
  return (
    <form action={action} className="space-y-3">
      <SignUpFields locale={locale} />
      {state.error ? <p className="text-sm text-danger">{errorCopy[state.error]?.[locale] ?? state.error}</p> : null}
      <SubmitButton className="w-full">
        {tx(locale, "Créer le compte", "Create account")}
      </SubmitButton>
    </form>
  );
}

function ClerkSignUpForm({ locale }: { locale: AppLocale }) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [profile, setProfile] = useState<ClerkBindProfile | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  useErrorToast(error);

  useEffect(() => {
    if (authLoaded && isSignedIn) continueToJeunese();
  }, [authLoaded, isSignedIn]);

  async function finish(sessionId: string) {
    if (!setActive) throw new Error("Clerk setActive unavailable");
    await setActive({ session: sessionId });
    // Profile seed lives in Clerk unsafeMetadata; /sign-in/clerk reads it server-side.
    continueToJeunese();
  }

  async function onSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!isLoaded || !signUp) return;
    const data = new FormData(event.currentTarget);
    const seed: ClerkBindProfile = {
      firstName: String(data.get("firstName") ?? ""),
      lastName: String(data.get("lastName") ?? ""),
      phone: String(data.get("phone") ?? ""),
      country: String(data.get("country") ?? ""),
      gender: String(data.get("gender") ?? ""),
      dateOfBirth: String(data.get("dateOfBirth") ?? ""),
      language: data.get("language") === "en" ? "en" : "fr",
    };
    setPending(true);
    setError("");
    try {
      const result = await signUp.create({
        emailAddress: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        firstName: seed.firstName,
        lastName: seed.lastName,
        unsafeMetadata: {
          phone: seed.phone,
          country: seed.country,
          gender: seed.gender,
          dateOfBirth: seed.dateOfBirth,
          language: seed.language,
        },
      });
      if (result.status === "complete" && result.createdSessionId) {
        await finish(result.createdSessionId);
        return;
      }
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setProfile(seed);
      setNeedsCode(true);
      setPending(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "INVALID_STATE");
      setPending(false);
    }
  }

  async function onVerify(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!isLoaded || !signUp || !profile) return;
    setPending(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      const result = await signUp.attemptEmailAddressVerification({
        code: String(data.get("code") ?? ""),
      });
      if (result.status !== "complete" || !result.createdSessionId) {
        setError(tx(locale, "Vérification incomplète.", "Verification incomplete."));
        setPending(false);
        return;
      }
      await finish(result.createdSessionId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "INVALID_CODE");
      setPending(false);
    }
  }

  if (authLoaded && isSignedIn) {
    return (
      <p className="text-sm text-muted">
        {tx(locale, "Session Clerk détectée — ouverture de Jeunese…", "Clerk session found — opening Jeunese…")}
      </p>
    );
  }

  if (needsCode) {
    return (
      <form onSubmit={onVerify} className="space-y-3">
        <p className="text-sm text-muted">
          {tx(locale, "Entrez le code envoyé par Clerk à votre e-mail.", "Enter the code Clerk sent to your email.")}
        </p>
        <input name="code" inputMode="numeric" required className={field} placeholder="000000" />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" loading={pending} disabled={!isLoaded}>
          {tx(locale, "Vérifier et continuer", "Verify and continue")}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <SignUpFields locale={locale} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" className="w-full" loading={pending} disabled={!isLoaded || redirecting}>
        {tx(locale, "Créer le compte", "Create account")}
      </Button>
      <Button
        variant="secondary"
        size="lg"
        className="w-full text-sm"
        loading={redirecting}
        disabled={!isLoaded || pending}
        onClick={() => {
          setRedirecting(true);
          signUp
            ?.authenticateWithRedirect({
              strategy: "oauth_google",
              redirectUrl: "/sign-in/sso-callback",
              redirectUrlComplete: clerkContinueHref(),
            })
            .catch((caught: unknown) => {
              setRedirecting(false);
              setError(caught instanceof Error ? caught.message : "INVALID_STATE");
            });
        }}
      >
        {tx(locale, "Continuer avec Google", "Continue with Google")}
      </Button>
    </form>
  );
}

function SignUpFields({ locale }: { locale: AppLocale }) {
  return (
    <>
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
        <span className="mt-1 block text-xs font-normal text-muted">
          {tx(locale, "Ouvert de 18 à 35 ans.", "Open from age 18 through 35.")}
        </span>
      </label>
      <select name="language" className={field} defaultValue={locale}>
        <option value="fr">Français</option>
        <option value="en">English</option>
      </select>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" className="mt-1" required />
        {tx(locale, "J'accepte les conditions de démonstration et la notice de confidentialité.", "I accept the demonstration terms and the privacy notice.")}
      </label>
    </>
  );
}

export function VerifyForm({ locale, email, demoCode }: { locale: AppLocale; email: string; demoCode: string | null }) {
  const [state, action] = useActionState(verifyEmailAction, {});
  useActionFeedback(state, locale);
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
      <SubmitButton className="w-full">
        {tx(locale, "Vérifier", "Verify")}
      </SubmitButton>
    </form>
  );
}

export function MfaForm({ locale }: { locale: AppLocale }) {
  const [state, action] = useActionState(mfaAction, {});
  useActionFeedback(state, locale);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted">
        {tx(
          locale,
          "Saisissez votre code personnel (Réglages → Ma sécurité). En production, ce serait une application d'authentification.",
          "Enter your personal confirmation code (Settings → My security). In production this would be an authenticator app.",
        )}
      </p>
      <input name="code" required className={field} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
      {state.error ? <p className="text-sm text-danger">{errorCopy[state.error]?.[locale] ?? state.error}</p> : null}
      <SubmitButton className="w-full">
        {tx(locale, "Confirmer", "Confirm")}
      </SubmitButton>
    </form>
  );
}

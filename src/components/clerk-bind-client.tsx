"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { bindClerkSession } from "@/server/actions";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/config";
import { tx } from "@/lib/i18n/tx";

function isNextRedirect(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT"),
  );
}

/** Invokes the bind Server Action (cookie writes are illegal during RSC render). */
export function ClerkBindClient({ locale }: { locale: AppLocale }) {
  const [failed, setFailed] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const started = useRef(false);

  function runBind() {
    startTransition(() => {
      void bindClerkSession()
        .then((result) => {
          // On success the action redirects and this never resolves with a value.
          if (result?.error) {
            setErrorCode(result.error);
            setFailed(true);
          }
        })
        .catch((error: unknown) => {
          if (isNextRedirect(error)) return;
          setErrorCode(null);
          setFailed(true);
        });
    });
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runBind();
  }, []);

  if (failed) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{tx(locale, "Connexion interrompue", "Sign-in interrupted")}</h1>
        <p className="text-sm text-muted">
          {tx(
            locale,
            "Votre compte Clerk est connecté, mais la session Jeunese n'a pas pu être ouverte. Réessayez ou déconnectez-vous pour recommencer.",
            "Your Clerk account is signed in, but the Jeunese session could not be opened. Try again, or sign out to start over.",
          )}
        </p>
        {errorCode ? <p className="text-xs text-muted">{tx(locale, "Code", "Code")}: {errorCode}</p> : null}
        <Button
          variant="link"
          size="inline"
          className="flex"
          loading={pending}
          onClick={() => {
            setFailed(false);
            runBind();
          }}
        >
          {tx(locale, "Réessayer", "Try again")}
        </Button>
        <SignOutButton className="text-sm font-semibold text-link">
          {tx(locale, "Se déconnecter et recommencer", "Sign out and start over")}
        </SignOutButton>
        <p className="text-xs text-muted">
          <Link href="/sign-in" className="font-semibold text-link">
            {tx(locale, "Retour à la connexion", "Back to sign in")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{tx(locale, "Ouverture de la session…", "Opening your session…")}</h1>
      <p className="text-sm text-muted">
        {tx(
          locale,
          "Votre compte Clerk est connecté. Nous préparons votre espace Jeunese.",
          "Your Clerk account is signed in. We are preparing your Jeunese workspace.",
        )}
      </p>
    </div>
  );
}

import Link from "next/link";
import { bindClerkSession, signOutAction } from "@/server/actions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function ClerkContinuePage() {
  try {
    await bindClerkSession();
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const locale = await getLocale();
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
        <Link href="/sign-in/clerk" className="inline-flex font-semibold text-violet">
          {tx(locale, "Réessayer", "Try again")}
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="text-sm font-semibold text-violet">
            {tx(locale, "Se déconnecter et recommencer", "Sign out and start over")}
          </button>
        </form>
      </div>
    );
  }
}

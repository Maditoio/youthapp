import Link from "next/link";
import { SignInForm } from "@/components/auth-forms";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export default async function SignInPage() {
  const locale = await getLocale();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{tx(locale, "Connexion", "Sign in")}</h1>
      <SignInForm locale={locale} />
      <p className="text-sm">
        <Link href="/sign-up" className="font-semibold text-violet">
          {tx(locale, "Créer un compte", "Create an account")}
        </Link>
      </p>
    </div>
  );
}

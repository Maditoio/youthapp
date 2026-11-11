import Link from "next/link";
import { SignUpForm } from "@/components/auth-forms";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export default async function SignUpPage() {
  const locale = await getLocale();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{tx(locale, "Créer un compte", "Create an account")}</h1>
      <SignUpForm locale={locale} useClerk={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} />
      <p className="text-sm">
        <Link href="/sign-in" className="font-semibold text-violet">
          {tx(locale, "Déjà un compte", "Already have an account")}
        </Link>
      </p>
    </div>
  );
}

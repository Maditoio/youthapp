import Link from "next/link";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function SignUpPage() {
  const dict = await getDictionary();

  return (
    <div className="space-y-4">
      <h1 className="text-brand-forest text-2xl font-bold">
        {dict.auth.signUpTitle}
      </h1>
      <p className="text-text-secondary text-sm">{dict.auth.stubNote}</p>
      <p className="text-text-secondary text-sm">
        <Link
          href="/sign-in"
          className="text-brand-green font-medium underline"
        >
          {dict.common.signIn}
        </Link>
      </p>
    </div>
  );
}

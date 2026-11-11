import { ClerkBindClient } from "@/components/clerk-bind-client";
import { getLocale } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

/** Clerk continue page: bind runs via Server Action from the client, not during RSC render. */
export default async function ClerkContinuePage() {
  const locale = await getLocale();
  return <ClerkBindClient locale={locale} />;
}

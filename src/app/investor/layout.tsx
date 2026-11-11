import { redirect } from "next/navigation";
import { InvestorShell, type ShellLabels } from "@/components/investor-shell";
import { getDictionary, getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { isInvestorOnboardingComplete } from "@/server/domain/mutate";

export const dynamic = "force-dynamic";

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!session.roles.includes("investor")) {
    redirect(session.roles.includes("issuer_manager") ? "/issuer" : "/admin");
  }

  const { headers } = await import("next/headers");
  const pathname = (await headers()).get("x-pathname") ?? "";
  const onOnboarding = pathname.includes("/investor/onboarding");
  if (!onOnboarding && !isInvestorOnboardingComplete(session.db, session.user.id)) {
    redirect("/investor/onboarding");
  }

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const labels: ShellLabels = {
    dashboard: dict.nav.dashboard,
    statistics: tx(locale, "Statistiques", "Statistics"),
    projects: dict.nav.projects,
    portfolio: dict.nav.portfolio,
    votes: tx(locale, "Votes", "Votes"),
    profile: dict.nav.profile,
    signOut: tx(locale, "Sortir", "Sign out"),
  };
  return (
    <InvestorShell name={session.user.legalFirstName} labels={labels}>
      {children}
    </InvestorShell>
  );
}

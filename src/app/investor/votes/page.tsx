import { redirect } from "next/navigation";
import { voteAction } from "@/server/actions";
import { formatDate } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function VotesPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  return (
    <div className="space-y-4 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Votes", "Votes")}</h1>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {session.db.resolutions.map((resolution) => {
          const eligibility = session.db.resolutionEligibility.find(
            (item) => item.resolutionId === resolution.id && item.investorProfileId === profile?.id,
          );
          const vote = session.db.votes.find(
            (item) => item.resolutionId === resolution.id && item.investorProfileId === profile?.id,
          );
          return (
            <article key={resolution.id} className="rounded-[28px] bg-white p-5">
              <h2 className="text-xl font-bold">{tx(locale, resolution.titleFr, resolution.titleEn)}</h2>
              <p className="mt-2 text-sm">{tx(locale, resolution.resolutionTextFr, resolution.resolutionTextEn)}</p>
              <p className="mt-2 text-xs text-muted">
                {tx(locale, "Arrêté", "Record")} {formatDate(resolution.recordDate, locale)} · {formatDate(resolution.opensAt, locale)} – {formatDate(resolution.closesAt, locale)}
              </p>
              <p className="text-xs text-muted">{tx(locale, resolution.quorumFr, resolution.quorumEn)}</p>
              {vote ? <p className="mt-3 font-semibold">{vote.voteChoice} · {vote.votesCast}</p> : null}
              {!vote && eligibility ? (
                <form action={voteAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="resolutionId" value={resolution.id} />
                  {(["FOR", "AGAINST", "ABSTAIN"] as const).map((choice) => (
                    <SubmitButton key={choice} name="choice" value={choice} size="sm">
                      {choice === "FOR" ? tx(locale, "Pour", "For") : choice === "AGAINST" ? tx(locale, "Contre", "Against") : tx(locale, "Abstention", "Abstain")}
                    </SubmitButton>
                  ))}
                </form>
              ) : null}
              {!eligibility ? <p className="mt-3 text-sm text-muted">{tx(locale, "Vous n'avez pas de voix sur cette résolution.", "You have no votes on this resolution.")}</p> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

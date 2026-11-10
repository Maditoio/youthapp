import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function VotesAdmin() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Résolutions", "Resolutions")}</h1>
      {session.db.resolutions.map((resolution) => {
        const votes = session.db.votes.filter((item) => item.resolutionId === resolution.id);
        return (
          <article key={resolution.id} className="rounded-[24px] bg-white p-4 text-sm">
            <p className="font-bold">{tx(locale, resolution.titleFr, resolution.titleEn)}</p>
            <p>{resolution.status} · {tx(locale, "voix exprimées", "votes cast")} {votes.reduce((sum, vote) => sum + vote.votesCast, 0)}</p>
            {votes.map((vote) => <p key={vote.id}>{vote.voteChoice} · {vote.votesCast}</p>)}
          </article>
        );
      })}
    </div>
  );
}

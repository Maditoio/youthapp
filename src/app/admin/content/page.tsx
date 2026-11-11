import { publishUpdateAction } from "@/server/actions";
import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

export default async function ContentAdmin() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{tx(locale, "Contenu", "Content")}</h1>
      {session.db.projectUpdates.map((item) => (
        <article key={item.id} className="rounded-[24px] bg-white p-4 text-sm">
          <p className="font-bold">{tx(locale, item.titleFr, item.titleEn)} · {item.approvalStatus}</p>
          <p>{tx(locale, item.bodyFr, item.bodyEn)}</p>
          {item.approvalStatus === "SUBMITTED" ? (
            <form action={publishUpdateAction}>
              <input type="hidden" name="updateId" value={item.id} />
              <SubmitButton variant="link" size="inline" className="mt-2">{tx(locale, "Publier", "Publish")}</SubmitButton>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}

import { redirect } from "next/navigation";
import { readNoteAction } from "@/server/actions";
import { formatDateTime } from "@/lib/format";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const notes = session.db.notifications.filter((item) => item.userId === session.user.id);
  return (
    <div className="space-y-3 px-4 md:px-0">
      <h1 className="text-3xl font-bold">{tx(locale, "Notifications", "Notifications")}</h1>
      {notes.map((note) => (
        <article key={note.id} className="rounded-[28px] bg-white p-4">
          <p className="font-bold">{tx(locale, note.titleFr, note.titleEn)}</p>
          <p className="text-sm">{tx(locale, note.bodyFr, note.bodyEn)}</p>
          <p className="text-xs text-muted">{formatDateTime(note.createdAt, locale)} · {note.status}</p>
          {note.status === "UNREAD" ? (
            <form action={readNoteAction}>
              <input type="hidden" name="id" value={note.id} />
              <button className="mt-2 text-sm font-semibold text-violet">{tx(locale, "Marquer comme lu", "Mark read")}</button>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}

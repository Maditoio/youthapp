import { getSession } from "@/server/auth/session";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const logs = [...session.db.auditLogs].reverse();
  return (
    <div>
      <h1 className="text-3xl font-bold">{tx(locale, "Journal", "Audit log")}</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {logs.map((log) => (
          <li key={log.id} className="rounded-2xl bg-white p-3">
            {formatDateTime(log.createdAt, locale)} · {log.action} · {log.resourceType} · {log.reason ?? ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

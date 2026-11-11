import { createStaffAction, rotateStaffCodeAction } from "@/server/actions";
import { ASSIGNABLE_STAFF_ROLES } from "@/server/domain/mutate";
import { errorCopy } from "@/server/domain/errors";
import { getSession } from "@/server/auth/session";
import { genderLabel, readGender } from "@/lib/choices";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { SubmitButton } from "@/components/ui/submit-button";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, { fr: string; en: string }> = {
  platform_admin: { fr: "Administrateur plateforme", en: "Platform admin" },
  kyc_officer: { fr: "Agent identité", en: "KYC officer" },
  finance_officer: { fr: "Agent finance", en: "Finance officer" },
  project_analyst: { fr: "Analyste projet", en: "Project analyst" },
  offering_approver: { fr: "Approbateur d'offre", en: "Offering approver" },
  support_agent: { fr: "Support", en: "Support agent" },
  auditor: { fr: "Auditeur", en: "Auditor" },
};

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const params = await searchParams;
  const error = params.error;
  const ok = params.ok;
  const canManage = session.roles.includes("platform_admin");
  const field = "h-12 w-full rounded-2xl border border-border bg-white px-3 text-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{tx(locale, "Personnel", "Staff")}</h1>
        <p className="mt-1 text-sm text-muted">
          {tx(
            locale,
            "Chaque membre du personnel a un numéro et un code de confirmation unique (affiché ici pour les administrateurs).",
            "Each staff member has a staff number and a unique confirmation code (shown here for administrators).",
          )}
        </p>
      </div>

      {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
      {ok === "created" ? (
        <p className="text-sm text-violet">
          {tx(locale, "Membre du personnel ajouté. Le code est visible ci-dessous.", "Staff member added. The code is visible below.")}
        </p>
      ) : null}
      {ok === "rotated" ? (
        <p className="text-sm text-violet">
          {tx(locale, "Code régénéré. L'ancien code ne fonctionne plus.", "Code rotated. The previous code no longer works.")}
        </p>
      ) : null}

      {canManage ? (
        <form action={createStaffAction} className="max-w-xl space-y-2 rounded-[24px] bg-white p-5">
          <h2 className="text-lg font-bold">{tx(locale, "Ajouter un membre", "Add staff")}</h2>
          <p className="text-xs text-muted">
            {tx(
              locale,
              "L'utilisateur doit déjà exister (e-mail enregistré). Un code personnel unique est généré automatiquement.",
              "The user must already exist (registered email). A unique confirmation code is generated automatically.",
            )}
          </p>
          <input
            name="email"
            type="email"
            required
            placeholder={tx(locale, "E-mail du compte", "Account email")}
            className={field}
          />
          <select name="role" required className={field} defaultValue="kyc_officer">
            {ASSIGNABLE_STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {tx(locale, ROLE_LABELS[role]?.fr ?? role, ROLE_LABELS[role]?.en ?? role)}
              </option>
            ))}
          </select>
          <SubmitButton size="sm">
            {tx(locale, "Ajouter et générer le code", "Add and generate code")}
          </SubmitButton>
        </form>
      ) : null}

      <div className="space-y-3">
        {session.db.staffProfiles.length === 0 ? (
          <p className="rounded-[24px] bg-white p-4 text-sm text-muted">
            {tx(locale, "Aucun profil personnel pour l'instant.", "No staff profiles yet.")}
          </p>
        ) : (
          session.db.staffProfiles.map((staff) => {
            const user = session.db.users.find((item) => item.id === staff.userId);
            const roles = session.db.userRoles
              .filter((item) => item.userId === staff.userId)
              .map((item) => item.role)
              .join(", ");
            const gender = readGender(user?.gender);
            return (
              <article key={staff.id} className="space-y-2 rounded-[24px] bg-white p-4 text-sm">
                <p className="font-bold">
                  {staff.staffNumber} · {user?.legalFirstName} {user?.legalLastName}
                </p>
                <p>
                  {user?.email}
                  {gender ? ` · ${genderLabel(locale, gender)}` : ""}
                </p>
                <p className="text-muted">{roles || tx(locale, "Aucun rôle", "No roles")}</p>
                <p>
                  {tx(locale, "Statut", "Status")}: {staff.status}
                </p>
                <p className="rounded-2xl bg-lilac px-3 py-2 font-mono text-base tracking-widest">
                  {tx(locale, "Code", "Code")}: <strong>{staff.mfaCodeDisplay}</strong>
                </p>
                {canManage ? (
                  <form action={rotateStaffCodeAction}>
                    <input type="hidden" name="staffId" value={staff.id} />
                    <SubmitButton variant="secondary" size="sm" className="h-8 text-xs">
                      {tx(locale, "Régénérer le code", "Rotate code")}
                    </SubmitButton>
                  </form>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

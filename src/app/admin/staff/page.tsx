import { createStaffAction, rotateStaffCodeAction } from "@/server/actions";
import { ASSIGNABLE_STAFF_ROLES } from "@/server/domain/mutate";
import { errorCopy } from "@/server/domain/errors";
import { ModalOpenLink, SearchParamModal } from "@/components/search-param-modal";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/ui/data-table";
import { uniqueFilterOptions } from "@/components/ui/data-table-utils";
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

function readIssuedCode(raw: string | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim();
  return /^\d{6}$/.test(code) ? code : null;
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; modal?: string; issued?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  const params = await searchParams;
  const error = params.error;
  const canManage = session.roles.includes("platform_admin");
  const issuedCode = canManage ? readIssuedCode(params.issued) : null;
  const field = "h-12 w-full rounded-2xl border border-border bg-white px-3 text-sm";

  const columns: DataTableColumn[] = [
    { id: "number", header: tx(locale, "Numéro", "Number"), sortable: true },
    { id: "name", header: tx(locale, "Nom", "Name"), sortable: true },
    { id: "email", header: tx(locale, "E-mail", "Email"), hideOnMobile: true },
    { id: "roles", header: tx(locale, "Rôles", "Roles"), hideOnMobile: true },
    {
      id: "status",
      header: tx(locale, "Statut", "Status"),
      sortable: true,
      filter: {
        options: uniqueFilterOptions(session.db.staffProfiles.map((staff) => staff.status)),
        allLabel: tx(locale, "Tous les statuts", "All statuses"),
      },
    },
  ];

  const rows: DataTableRow[] = session.db.staffProfiles.map((staff) => {
    const user = session.db.users.find((item) => item.id === staff.userId);
    const roles = session.db.userRoles
      .filter((item) => item.userId === staff.userId)
      .map((item) => item.role)
      .join(", ");
    const gender = readGender(user?.gender);
    const name = `${user?.legalFirstName ?? ""} ${user?.legalLastName ?? ""}`.trim();
    return {
      id: staff.id,
      searchValue: `${staff.staffNumber} ${name} ${user?.email ?? ""} ${roles} ${staff.status}`,
      filterValues: { status: staff.status },
      sortValues: {
        number: staff.staffNumber,
        name,
        email: user?.email ?? "",
        roles,
        status: staff.status,
      },
      cells: {
        number: <span className="font-semibold">{staff.staffNumber}</span>,
        name: (
          <span>
            {name || "—"}
            {gender ? <span className="block text-xs text-muted">{genderLabel(locale, gender)}</span> : null}
          </span>
        ),
        email: user?.email ?? "—",
        roles: roles || tx(locale, "Aucun rôle", "No roles"),
        status: staff.status,
      },
      actions: canManage ? (
        <form action={rotateStaffCodeAction}>
          <input type="hidden" name="staffId" value={staff.id} />
          <SubmitButton variant="secondary" size="sm" className="h-8 text-xs">
            {tx(locale, "Régénérer le code", "Rotate code")}
          </SubmitButton>
        </form>
      ) : null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{tx(locale, "Personnel", "Staff")}</h1>
          <p className="mt-1 text-sm text-muted">
            {tx(
              locale,
              "Annuaire du personnel : numéro, rôles et statut. Les codes de confirmation ne sont pas listés ici — chacun les voit dans Réglages ; un administrateur plateforme les voit une seule fois à la création ou à la régénération.",
              "Staff directory: number, roles, and status. Confirmation codes are not listed here — each person sees theirs in Settings; a platform admin sees a new code once when creating or rotating.",
            )}
          </p>
        </div>
        {canManage ? (
          <ModalOpenLink
            href="/admin/staff?modal=new"
            className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white"
          >
            {tx(locale, "Ajouter", "Add")}
          </ModalOpenLink>
        ) : null}
      </div>

      {issuedCode ? (
        <div className="rounded-[24px] border border-violet/30 bg-lilac px-5 py-4">
          <p className="text-sm font-semibold text-ink">
            {params.ok === "rotated"
              ? tx(locale, "Nouveau code (affiché une seule fois)", "New code (shown once)")
              : tx(locale, "Code généré (affiché une seule fois)", "Generated code (shown once)")}
          </p>
          <p className="mt-2 font-mono text-2xl tracking-[0.35em] text-violet">{issuedCode}</p>
          <p className="mt-2 text-xs text-muted">
            {tx(
              locale,
              "Communiquez ce code de façon sécurisée au membre concerné. Il ne réapparaîtra pas dans cet annuaire. Le membre peut aussi le voir dans Réglages.",
              "Share this code securely with the staff member. It will not appear again in this directory. They can also view it under Settings.",
            )}
          </p>
        </div>
      ) : null}

      <DataTable
        locale={locale}
        columns={columns}
        rows={rows}
        emptyMessage={tx(locale, "Aucun profil personnel pour l'instant.", "No staff profiles yet.")}
      />

      {canManage ? (
        <SearchParamModal
          title={tx(locale, "Ajouter un membre", "Add staff")}
          description={tx(
            locale,
            "L'utilisateur doit déjà exister (e-mail enregistré). Un code personnel unique est généré et affiché une seule fois après l'ajout.",
            "The user must already exist (registered email). A unique confirmation code is generated and shown once after adding.",
          )}
        >
          <form action={createStaffAction} className="space-y-2">
            {error ? <p className="text-sm text-danger">{errorCopy[error]?.[locale] ?? error}</p> : null}
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
            <SubmitButton size="sm">{tx(locale, "Ajouter et générer le code", "Add and generate code")}</SubmitButton>
          </form>
        </SearchParamModal>
      ) : null}
    </div>
  );
}

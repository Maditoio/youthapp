import { getSession } from "@/server/auth/session";
import { genderLabel, readGender } from "@/lib/choices";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await getSession();
  if (!session) return null;
  const locale = await getLocale();
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold">{tx(locale, "Personnel", "Staff")}</h1>
      {session.db.staffProfiles.map((staff) => {
        const user = session.db.users.find((item) => item.id === staff.userId);
        const roles = session.db.userRoles.filter((item) => item.userId === staff.userId).map((item) => item.role).join(", ");
        const gender = readGender(user?.gender);
        return (
          <p key={staff.id} className="rounded-2xl bg-white p-3 text-sm">
            {staff.staffNumber} · {user?.legalFirstName} {user?.legalLastName}
            {gender ? ` · ${genderLabel(locale, gender)}` : ""}
            {" · "}
            {roles}
          </p>
        );
      })}
    </div>
  );
}

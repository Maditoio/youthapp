import Link from "next/link";
import { BadgeCheck, ChevronRight, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-forms";
import { ModalOpenLink, SearchParamModal } from "@/components/search-param-modal";
import { StatusPill } from "@/components/visuals";
import { PERMITTED_COUNTRIES, genderLabel, readGender } from "@/lib/choices";
import { maskValue } from "@/lib/format";
import { kycStatusLabel, kycStatusTone } from "@/lib/kyc-decisions";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

function countryName(locale: "fr" | "en", code: string | null) {
  if (!code) return "—";
  const match = PERMITTED_COUNTRIES.find((item) => item.code === code);
  return match ? tx(locale, match.fr, match.en) : code;
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-b border-border/70 py-3 last:border-b-0">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-semibold text-ink">{value || "—"}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const locale = await getLocale();
  const profile = session.db.investorProfiles.find((item) => item.userId === session.user.id);
  if (!profile) return null;
  const status = profile.onboardingStatus;
  const approved = status === "APPROVED";
  const gender = readGender(profile.gender);
  const fullName = [profile.legalFirstName, profile.legalMiddleName, profile.legalLastName]
    .filter(Boolean)
    .join(" ");
  const initial = profile.legalFirstName.slice(0, 1).toUpperCase();

  return (
    <div className="space-y-4 px-4 pb-8 md:px-0">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6d4dff] to-[#7a5cff] p-5 text-white shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/20 text-xl font-bold">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight">{fullName}</h1>
              {approved ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  {tx(locale, "Vérifié", "Verified")}
                </span>
              ) : (
                <StatusPill tone={kycStatusTone(status)}>{kycStatusLabel(locale, status)}</StatusPill>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-white/80">{session.user.email}</p>
            <p className="mt-2 font-mono text-xs tracking-wide text-white/70">{profile.investorNumber}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-white/12 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 break-words">
              {approved
                ? tx(locale, "Identité approuvée", "Identity approved")
                : tx(locale, "Statut d'identité", "Identity status")}
              {approved ? "" : ` · ${kycStatusLabel(locale, status)}`}
            </span>
          </div>
          {!approved ? (
            <Link
              href="/investor/onboarding"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white/90 underline-offset-2 hover:underline"
            >
              {tx(locale, "Continuer la vérification", "Continue verification")}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </section>

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { href: "/investor/profile/contacts", label: tx(locale, "Proches", "Next of kin") },
          { href: "/investor/profile/beneficiaries", label: tx(locale, "Bénéficiaires", "Beneficiaries") },
          {
            href: approved ? "/investor/profile" : "/investor/onboarding",
            label: tx(locale, "Identité", "Identity"),
          },
          { href: "/investor/settings", label: tx(locale, "Réglages", "Settings") },
        ].map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className="rounded-2xl bg-surface px-3 py-3 text-center text-xs font-semibold text-violet shadow-sm"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="overflow-hidden rounded-[28px] bg-surface px-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 py-3">
          <h2 className="text-sm font-bold">{tx(locale, "Compte", "Account")}</h2>
          <ModalOpenLink
            href="/investor/profile?modal=edit"
            className="text-sm font-semibold text-violet underline-offset-2 hover:underline"
          >
            {tx(locale, "Modifier", "Edit")}
          </ModalOpenLink>
        </div>
        <dl>
          <ProfileRow label={tx(locale, "Investisseur", "Investor")} value={profile.investorNumber} />
          <ProfileRow label={tx(locale, "E-mail", "Email")} value={session.user.email} />
          <ProfileRow label={tx(locale, "Téléphone", "Phone")} value={session.user.phone ?? "—"} />
          <ProfileRow
            label={tx(locale, "Identité", "Identity")}
            value={approved ? tx(locale, "Approuvée / vérifiée", "Approved / verified") : kycStatusLabel(locale, status)}
          />
          <ProfileRow label={tx(locale, "Pays", "Country")} value={countryName(locale, profile.countryOfResidence)} />
          <ProfileRow label={tx(locale, "Genre", "Gender")} value={gender ? genderLabel(locale, gender) : "—"} />
          <ProfileRow label={tx(locale, "Fiscal", "Tax id")} value={maskValue(profile.taxId) || "—"} />
        </dl>
      </section>

      <SearchParamModal
        param="modal"
        value="edit"
        title={tx(locale, "Modifier le profil", "Edit profile")}
        size="xl"
      >
        <ProfileForm
          locale={locale}
          defaults={{
            firstName: profile.legalFirstName,
            middleName: profile.legalMiddleName,
            lastName: profile.legalLastName,
            phone: session.user.phone ?? "",
            country: profile.countryOfResidence ?? "",
            gender: gender ?? "",
            language: session.user.preferredLanguage,
            dateOfBirth: profile.dateOfBirth ?? "",
            nationality: profile.nationality ?? "",
            addressLine: profile.addressLine ?? "",
            city: profile.city ?? "",
            taxResidency: profile.taxResidency ?? "",
            taxId: "",
            sourceOfFunds: profile.sourceOfFunds ?? "",
            payoutLabel: profile.payoutLabel ?? "",
            pep: profile.pepStatus === "YES" ? "YES" : "NO",
          }}
        />
      </SearchParamModal>
    </div>
  );
}

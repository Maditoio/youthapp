import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AdminHomePage() {
  const dict = await getDictionary();

  return (
    <div className="max-w-2xl space-y-3">
      <h2 className="text-brand-forest text-2xl font-bold">
        {dict.admin.title}
      </h2>
      <p className="text-text-secondary">{dict.admin.stub}</p>
    </div>
  );
}

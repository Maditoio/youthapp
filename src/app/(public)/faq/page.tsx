import { ProsePage } from "@/components/prose-page";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getStore } from "@/server/db/store";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const locale = await getLocale();
  const faqs = (await getStore()).db.faqs;
  return (
    <ProsePage locale={locale} returnTo="/faq" title="FAQ">
      {faqs.map((faq) => (
        <article key={faq.id}>
          <h2 className="text-lg font-bold">{tx(locale, faq.questionFr, faq.questionEn)}</h2>
          <p>{tx(locale, faq.answerFr, faq.answerEn)}</p>
        </article>
      ))}
    </ProsePage>
  );
}

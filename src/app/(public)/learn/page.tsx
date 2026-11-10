import { ProsePage } from "@/components/prose-page";
import { getLocale } from "@/lib/i18n/get-dictionary";
import { tx } from "@/lib/i18n/tx";
import { getStore } from "@/server/db/store";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const locale = await getLocale();
  const articles = getStore().db.articles;
  return (
    <ProsePage locale={locale} returnTo="/learn" title={tx(locale, "Apprendre", "Learn")}>
      {articles.map((article) => (
        <article key={article.id}>
          <h2 className="text-xl font-bold">{tx(locale, article.titleFr, article.titleEn)}</h2>
          <p>{tx(locale, article.bodyFr, article.bodyEn)}</p>
        </article>
      ))}
    </ProsePage>
  );
}

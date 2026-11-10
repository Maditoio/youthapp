import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function HomePage() {
  const dict = await getDictionary();

  return (
    <section className="bg-brand-forest relative overflow-hidden text-[var(--text-on-forest)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #278B70 0%, transparent 45%), radial-gradient(circle at 80% 60%, #C58B55 0%, transparent 40%)",
        }}
      />
      <div className="relative mx-auto flex min-h-[70dvh] max-w-6xl flex-col justify-center gap-6 px-4 py-16 sm:py-24">
        <p className="text-brand-copper text-sm font-semibold tracking-[0.2em] uppercase">
          {dict.common.productName}
        </p>
        <h1 className="max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {dict.common.tagline}
        </h1>
        <p className="max-w-2xl text-lg text-[color-mix(in_srgb,var(--text-on-forest)_88%,transparent)]">
          {dict.public.heroSupport}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/#projects">
            <Button variant="copper" size="lg">
              {dict.common.exploreProjects}
            </Button>
          </Link>
          <Link href="/#how-it-works">
            <Button
              variant="secondary"
              size="lg"
              className="border-transparent bg-white/10 text-[var(--text-on-forest)] hover:bg-white/20"
            >
              {dict.common.howItWorks}
            </Button>
          </Link>
        </div>
        <p className="mt-8 max-w-xl text-sm text-[color-mix(in_srgb,var(--text-on-forest)_70%,transparent)]">
          {dict.public.placeholderNote}
        </p>
      </div>
    </section>
  );
}

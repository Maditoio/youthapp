export default function Loading() {
  return (
    <div className="page-loading mx-auto max-w-5xl space-y-4 px-4 py-8" aria-hidden>
      <div className="h-44 animate-pulse rounded-[2.75rem] bg-white/80 shadow-[var(--shadow-card)]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-[2.25rem] bg-white/75" />
        <div className="h-28 animate-pulse rounded-[2.25rem] bg-white/75 [animation-delay:80ms]" />
        <div className="h-28 animate-pulse rounded-[2.25rem] bg-white/75 [animation-delay:140ms]" />
      </div>
    </div>
  );
}

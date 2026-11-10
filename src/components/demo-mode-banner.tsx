import { appConfig } from "@/lib/config";

type DemoModeBannerProps = {
  message: string;
};

/**
 * Visible DEMO DATA banner for fictional / sandbox content.
 * Hidden only when NEXT_PUBLIC_DEMO_MODE=false (production gate — Milestone 9).
 */
export function DemoModeBanner({ message }: DemoModeBannerProps) {
  if (!appConfig.demoMode) {
    return null;
  }

  return (
    <div
      role="status"
      className="bg-[var(--demo-banner-bg)] px-4 py-2 text-center text-sm font-medium text-[var(--demo-banner-fg)]"
    >
      {message}
    </div>
  );
}

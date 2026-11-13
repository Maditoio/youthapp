import { NextResponse } from "next/server";
import { runOfferingReminderSweep } from "@/server/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Vercel Cron (or manual) sweep for offering open / opens-soon in-app reminders.
 * Auth: Authorization: Bearer $CRON_SECRET when CRON_SECRET is set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("authorization") ?? "";
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    const sent = await runOfferingReminderSweep();
    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    );
  }
}

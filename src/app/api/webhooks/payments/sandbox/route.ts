import { NextResponse } from "next/server";
import { signPayload } from "@/server/domain/crypto";
import { AppError } from "@/server/domain/errors";
import { applySandboxPayment } from "@/server/domain/mutate";
import { asAppError, getStore } from "@/server/db/store";

export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.SANDBOX_WEBHOOK_SECRET || "sandbox-demo-webhook-secret";
  const signature = request.headers.get("x-sandbox-signature") ?? "";
  if (signature.length === 0 || signature !== signPayload(body, secret)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }
  try {
    const event = JSON.parse(body) as {
      providerEventId: string;
      providerTransactionId: string;
      subscriptionId: string;
      amountMinor: number;
      currencyCode: string;
    };
    const result = await (await getStore()).update((db) => applySandboxPayment(db, event));
    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch (error) {
    const known = asAppError(error) ?? (error instanceof AppError ? error : null);
    return NextResponse.json({ error: known?.code ?? "INVALID_STATE" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";

export function GET() {
  return NextResponse.json({
    ok: true,
    product: appConfig.productName,
    demoMode: appConfig.demoMode,
  });
}

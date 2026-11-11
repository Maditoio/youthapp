import { NextResponse } from "next/server";
import { bindClerkSession } from "@/server/actions";

/**
 * Route-handler bind path (cookie writes are allowed here).
 * Prefer the /sign-in/clerk client → Server Action flow; this remains a safe fallback.
 */
export async function GET(request: Request) {
  try {
    await bindClerkSession();
    // bindClerkSession redirects on success; if it returns, send the user onward.
    return NextResponse.redirect(new URL("/investor", request.url));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return NextResponse.redirect(new URL("/sign-in/clerk", request.url));
  }
}

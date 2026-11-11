import { NextResponse } from "next/server";
import { bindClerkSession } from "@/server/actions";

/**
 * Route-handler bind path (cookie writes are allowed here).
 * Prefer the /sign-in/clerk client → Server Action flow; this remains a safe fallback.
 */
export async function GET(request: Request) {
  try {
    // Redirects on success; returning means the bind failed (already logged).
    await bindClerkSession();
    return NextResponse.redirect(new URL("/sign-in/clerk", request.url));
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

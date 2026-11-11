/** After Clerk has an active session, bind the Jeunese cookie via a full navigation. */
export const CLERK_CONTINUE_PATH = "/sign-in/clerk";

export function clerkContinueHref(): string {
  return CLERK_CONTINUE_PATH;
}

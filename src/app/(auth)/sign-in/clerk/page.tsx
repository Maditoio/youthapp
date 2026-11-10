import { bindClerkSession } from "@/server/actions";

export default async function ClerkContinuePage() {
  await bindClerkSession();
}

import { getSession } from "./auth/session";

export async function issuerScope() {
  const session = await getSession();
  if (!session) return null;
  const reps = session.db.issuerRepresentatives.filter((item) => item.userId === session.user.id);
  const issuerIds = new Set(reps.map((item) => item.issuerId));
  return { session, issuerIds };
}

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Draft create now opens as a modal on the projects list. */
export default async function NewProjectRedirect({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = (await searchParams).error;
  redirect(error ? `/admin/projects?modal=new&error=${encodeURIComponent(error)}` : "/admin/projects?modal=new");
}

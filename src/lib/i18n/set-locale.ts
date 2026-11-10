"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAppLocale, localeCookieName } from "./config";

export async function setLocale(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/");

  if (!isAppLocale(locale)) {
    redirect(returnTo);
  }

  const jar = await cookies();
  jar.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  redirect(returnTo);
}

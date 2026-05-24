"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCookieName } from "./session";

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(getCookieName());
  redirect("/");
}

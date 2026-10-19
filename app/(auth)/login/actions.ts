"use server";

import { redirect } from "next/navigation";
import { loginWithCredentials, logoutSession } from "@/lib/auth";

export async function loginAction(
  prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const success = await loginWithCredentials(username, password);
  if (!success) {
    return { error: "Invalid username or password. Check AUTH_USERNAME and AUTH_PASSWORD in .env.local." };
  }

  redirect(redirectTo);
}

export async function logoutAction() {
  await logoutSession();
  redirect("/");
}

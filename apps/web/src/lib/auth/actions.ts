"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { isFakeUserId } from "./fake-users";
import { USER_COOKIE } from "./current-user";

/**
 * Switch the active demo user. Used by the in-nav user switcher.
 * Demo-only — replaced by Clerk in V1 production.
 */
export async function switchUser(formData: FormData): Promise<void> {
  const raw = formData.get("user_id");
  if (!isFakeUserId(raw)) return;
  const store = await cookies();
  store.set(USER_COOKIE, raw, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  revalidatePath("/", "layout");
}

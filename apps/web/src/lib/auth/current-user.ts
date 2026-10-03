/**
 * Server-side current-user helper.
 *
 * Reads the active fake user from a cookie (`silkpay_user`). Defaults to Chinedu
 * (importer) when missing/invalid. Always pairs the user with their org.
 */
import "server-only";

import { cookies } from "next/headers";

import { getOrganizationById } from "@/lib/db/queries";
import type { Organization } from "@/lib/db/schema";

import {
  DEFAULT_USER_ID,
  FAKE_USERS,
  type FakeUser,
  type FakeUserId,
  isFakeUserId,
} from "./fake-users";

export const USER_COOKIE = "silkpay_user";

export type CurrentUser = {
  user: FakeUser;
  org: Organization;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const store = await cookies();
  const raw = store.get(USER_COOKIE)?.value;
  const id: FakeUserId = isFakeUserId(raw) ? raw : DEFAULT_USER_ID;
  const user = FAKE_USERS[id];
  const org = await getOrganizationById(user.org_id);
  if (!org) {
    // Should not happen — seed data always present.
    throw new Error(`Seed inconsistency: org ${user.org_id} for user ${id} missing`);
  }
  return { user, org };
}

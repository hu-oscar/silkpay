/**
 * Hardcoded users for the hackathon (no Clerk).
 *
 * Each user is bound to one organization (importer / supplier / arbiter) so
 * the demo can switch perspective by changing the active user via cookie.
 */
import { ORG_ARBITER_ID, ORG_IMPORTER_ID, ORG_SUPPLIER_ID } from "@/lib/db/seed";

export type FakeUserId = "chinedu" | "chen" | "silkpay-arbiter";

export type FakeUser = {
  id: FakeUserId;
  full_name: string;
  display_name: string;
  email: string;
  avatar_initials: string;
  role: "importer" | "supplier" | "arbiter";
  org_id: string;
  preferred_locale: "fr" | "en" | "zh";
};

export const FAKE_USERS: Record<FakeUserId, FakeUser> = {
  chinedu: {
    id: "chinedu",
    full_name: "Chinedu Okafor",
    display_name: "Chinedu",
    email: "chinedu@chinedutrading.ng",
    avatar_initials: "CO",
    role: "importer",
    org_id: ORG_IMPORTER_ID,
    preferred_locale: "fr",
  },
  chen: {
    id: "chen",
    full_name: "陈伟 (Chen Wei)",
    display_name: "陈先生",
    email: "wei.chen@yiwusmart.cn",
    avatar_initials: "陈",
    role: "supplier",
    org_id: ORG_SUPPLIER_ID,
    preferred_locale: "zh",
  },
  "silkpay-arbiter": {
    id: "silkpay-arbiter",
    full_name: "Silkpay Compliance Officer",
    display_name: "Silkpay Officer",
    email: "compliance@silkpay.finance",
    avatar_initials: "SC",
    role: "arbiter",
    org_id: ORG_ARBITER_ID,
    preferred_locale: "en",
  },
};

export const DEFAULT_USER_ID: FakeUserId = "chinedu";

export function isFakeUserId(value: unknown): value is FakeUserId {
  return value === "chinedu" || value === "chen" || value === "silkpay-arbiter";
}

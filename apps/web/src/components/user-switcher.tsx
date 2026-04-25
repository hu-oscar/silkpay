/**
 * Demo-only user switcher rendered in the top nav.
 *
 * Server Component — submits a tiny form to a Server Action that flips
 * the cookie. No JS required, works without hydration.
 */
import { switchUser } from "@/lib/auth/actions";
import { FAKE_USERS, type FakeUserId } from "@/lib/auth/fake-users";
import type { FakeUser } from "@/lib/auth/fake-users";

import { cn } from "@/lib/utils";

const ROLE_BADGE: Record<FakeUser["role"], { label: string; className: string }> = {
  importer: { label: "Importer", className: "bg-brand-100 text-brand-700" },
  supplier: { label: "Supplier", className: "bg-amber-100 text-amber-800" },
  arbiter: { label: "Arbiter", className: "bg-emerald-100 text-emerald-800" },
};

export function UserSwitcher({ activeUserId }: { activeUserId: FakeUserId }) {
  const active = FAKE_USERS[activeUserId];
  const badge = ROLE_BADGE[active.role];

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-sm font-medium text-ink-900">{active.display_name}</span>
        <span className="text-xs text-ink-500">{active.email}</span>
      </div>

      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-white">
        {active.avatar_initials}
      </div>

      <span
        className={cn(
          "hidden md:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          badge.className,
        )}
      >
        {badge.label}
      </span>

      {/* Demo perspective switch — visible on hover/focus */}
      <details className="relative">
        <summary className="cursor-pointer list-none rounded-md border border-ink-200 bg-white px-2 py-1 text-xs text-ink-500 hover:bg-ink-100">
          Switch
        </summary>
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-ink-200 bg-white p-2 shadow-lg">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-ink-500">
            Demo: change perspective
          </p>
          {(Object.values(FAKE_USERS) as FakeUser[]).map((u) => {
            const isActive = u.id === activeUserId;
            const ub = ROLE_BADGE[u.role];
            return (
              <form key={u.id} action={switchUser}>
                <input type="hidden" name="user_id" value={u.id} />
                <button
                  type="submit"
                  disabled={isActive}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    isActive
                      ? "bg-ink-100 text-ink-900 cursor-default"
                      : "hover:bg-ink-100 text-ink-700",
                  )}
                >
                  <span className="truncate">{u.display_name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase",
                      ub.className,
                    )}
                  >
                    {ub.label}
                  </span>
                </button>
              </form>
            );
          })}
        </div>
      </details>
    </div>
  );
}

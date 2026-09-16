import type { Role } from "@/lib/api/types";

/**
 * Where each role lands after signing in. Kept as a single lookup so the
 * auth page and any future route guard agree on the same destinations
 * instead of each hardcoding its own copy — see doc's access model (§2).
 */
const ROLE_HOME_PATH: Record<Role, string> = {
  CLIENT: "/",
  SALES_PERSON: "/sales/overview",
  STOCK_MANAGER: "/stock/overview",
  DATA_ANALYST: "/analytics/overview",
  ADMIN: "/admin/overview",
};

export const roleHomePath = (role: Role): string => ROLE_HOME_PATH[role];

/** Every role — used where a route just needs "signed in", not any particular role. */
export const ALL_ROLES = Object.keys(ROLE_HOME_PATH) as Role[];

/**
 * Where each role's own *personal* profile settings live — name/email/phone,
 * password, delete account (`AccountProfileForm`/`DeleteAccountDialog`). Not
 * the same as a dashboard's platform settings: `admin/settings` configures
 * the whole platform (low-stock alerts, profiling questions, doc §3.10), so
 * admin's personal profile lives at the separate `admin/account-settings`
 * instead — every other role's own `.../settings` page already doubles as
 * both, so it's the right target there.
 */
const ROLE_ACCOUNT_SETTINGS_PATH: Record<Role, string> = {
  CLIENT: "/account/settings",
  SALES_PERSON: "/sales/settings",
  STOCK_MANAGER: "/stock/settings",
  DATA_ANALYST: "/analytics/settings",
  ADMIN: "/admin/account-settings",
};

export const roleAccountSettingsPath = (role: Role): string => ROLE_ACCOUNT_SETTINGS_PATH[role];

/**
 * Which roles may sit inside each dashboard area — the single source of
 * truth for both `useRequireRole` (each layout's own gate) and the auth
 * page's post-login "send them back where they were going" check, so the
 * two can never drift apart. Every role now has exactly one dashboard of
 * its own: admin does not also get into sales/stock/analytics just by
 * being admin — each area is strictly its own role's, matching `/admin`'s
 * own duplicate inventory/collections/orders pages rather than reusing
 * `/stock` or `/sales`. `/account` is the client's own area; anything
 * outside every prefix below is the storefront, open to any signed-in role.
 */
const AREA_ROLES = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/sales", roles: ["SALES_PERSON"] },
  { prefix: "/stock", roles: ["STOCK_MANAGER"] },
  { prefix: "/analytics", roles: ["DATA_ANALYST"] },
  { prefix: "/account", roles: ["CLIENT"] },
] as const satisfies { prefix: string; roles: readonly Role[] }[];

export const ADMIN_ROLES = AREA_ROLES[0].roles;
export const SALES_ROLES = AREA_ROLES[1].roles;
export const STOCK_ROLES = AREA_ROLES[2].roles;
export const ANALYTICS_ROLES = AREA_ROLES[3].roles;
export const ACCOUNT_ROLES = AREA_ROLES[4].roles;

/**
 * Whether a signed-in `role` may land on `path` (locale-stripped, e.g.
 * `/admin/orders`). Used by the auth page to decide whether it can send
 * someone back to the route they originally wanted after signing in, or
 * must fall back to their own dashboard home instead.
 */
export const isPathAllowedForRole = (path: string, role: Role): boolean => {
  const area = AREA_ROLES.find(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`));
  return area ? (area.roles as readonly Role[]).includes(role) : true;
};

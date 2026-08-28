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

"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  Boxes,
  Plus,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TileAnalyticsSummary, canViewTileAnalytics } from "@/components/tile-analytics-summary";
import type { ApiProduct, Role } from "@/lib/api/types";

/**
 * Where each staff role's own dashboard already lets them act on a product —
 * mirrors `useRequireRole`'s allow-lists on `admin/`, `stock/`, `sales/`,
 * `analytics/` layouts. `undefined` means that role has no equivalent control
 * to surface, not that the field was forgotten.
 */
const INVENTORY_BASE: Partial<Record<Role, string>> = {
  STOCK_MANAGER: "/stock",
  ADMIN: "/admin",
};
const ORDER_BASE: Partial<Record<Role, string>> = {
  SALES_PERSON: "/sales",
  STOCK_MANAGER: "/stock",
  ADMIN: "/admin",
};
/**
 * Where "start an order with this product" deep-links to for a given staff
 * role, or `undefined` when that role can't create orders (data analyst —
 * `OrdersController`'s `@Roles` on `POST /orders`). Shared by the product
 * toolbar above and any other page that offers the same shortcut (the
 * calculator's "Add to an order", which used to point every role at the
 * customer-only `/account/cart`).
 */
export const staffOrderHref = (role: Role, productId: string): string | undefined => {
  const base = ORDER_BASE[role];
  return base ? `${base}/orders/new?product=${productId}` : undefined;
};

/**
 * "You're not a customer" banner shown above the catalog/collections grid
 * for signed-in staff, with a shortcut into the creation flow their own
 * dashboard already offers — skipped entirely for sales/analyst, who can't
 * create products or collections (`ProductsController`/`CollectionsController`
 * `@Roles`).
 */
export const StaffCatalogActions = ({ role, kind = "product" }: { role: Role; kind?: "product" | "collection" }) => {
  const { t } = useTranslation();
  const base = INVENTORY_BASE[role];

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-dashed border-amber/50 bg-amber/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-ink">{t("staffToolbar.catalogHint")}</p>
      {base && (
        <Button
          type="button"
          size="sm"
          nativeButton={false}
          render={<Link href={`${base}/${kind === "product" ? "inventory" : "collections"}/new`} />}
          className="w-fit gap-1.5 bg-primary px-4 font-bold text-ink hover:bg-primary/90"
        >
          <Plus className="size-4" />
          {t(kind === "product" ? "staffToolbar.newProduct" : "staffToolbar.newCollection")}
        </Button>
      )}
    </div>
  );
};

/**
 * Product-detail staff panel: real, staff-only data the API already sends
 * this viewer (`quantityOnHandSqm`, `reservedAreaSqm` — see `ApiProduct`),
 * plus deep links into whatever this role's own dashboard already lets them
 * do about it, instead of re-implementing edit/adjust-stock forms here.
 */
export const StaffProductToolbar = ({ role, product }: { role: Role; product: ApiProduct }) => {
  const { t } = useTranslation();
  const inventoryBase = INVENTORY_BASE[role];
  const orderHref = staffOrderHref(role, product.id);
  const showAnalytics = canViewTileAnalytics(role);

  return (
    <section className="space-y-5 rounded-2xl border border-dashed border-amber/50 bg-amber/5 p-6">
      <div className="flex items-center gap-2">
        <Warehouse className="size-5 text-ink" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink">{t("staffToolbar.product.title")}</h2>
      </div>

      {typeof product.quantityOnHandSqm === "number" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/70 p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              <Boxes className="size-3.5" /> {t("staffToolbar.product.onHand")}
            </p>
            <p className="mt-1 text-lg font-black text-ink">{product.quantityOnHandSqm.toLocaleString()} m²</p>
          </div>
          {typeof product.reservedAreaSqm === "number" && (
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{t("staffToolbar.product.reserved")}</p>
              <p className="mt-1 text-lg font-black text-ink">{product.reservedAreaSqm.toLocaleString()} m²</p>
            </div>
          )}
        </div>
      )}

      {showAnalytics && (
        <TileAnalyticsSummary
          productId={product.id}
          className="border-amber/20 bg-white/50"
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {inventoryBase && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`${inventoryBase}/inventory/${product.id}`} />}
            className="h-11 justify-between rounded-xl bg-white/80 px-4 font-bold hover:bg-white"
          >
            {t("staffToolbar.product.manageInventory")} <ArrowUpRight className="size-4" />
          </Button>
        )}
        {orderHref && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={orderHref} />}
            className="h-11 justify-between rounded-xl bg-white/80 px-4 font-bold hover:bg-white"
          >
            {t("staffToolbar.product.startOrder")} <ArrowUpRight className="size-4" />
          </Button>
        )}
        {role === "DATA_ANALYST" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/analytics/tiles/${product.id}`} />}
            className="h-11 justify-between rounded-xl bg-white/80 px-4 font-bold hover:bg-white"
          >
            {t("staffToolbar.product.analytics.viewFull")} <ArrowUpRight className="size-4" />
          </Button>
        )}
      </div>
    </section>
  );
};

/** Collection-detail staff panel — a single deep link into this role's own collection editor, when they have one. */
export const StaffCollectionToolbar = ({ role, collectionId }: { role: Role; collectionId: string }) => {
  const { t } = useTranslation();
  const base = INVENTORY_BASE[role];
  if (!base) return null;

  return (
    <div className="mb-6 flex items-center justify-between rounded-2xl border border-dashed border-amber/50 bg-amber/5 px-5 py-4">
      <p className="text-sm font-semibold text-ink">{t("staffToolbar.catalogHint")}</p>
      <Button
        type="button"
        size="sm"
        nativeButton={false}
        render={<Link href={`${base}/collections/${collectionId}`} />}
        className="w-fit gap-1.5 font-bold"
        variant="outline"
      >
        {t("staffToolbar.product.manageCollection")} <ArrowUpRight className="size-4" />
      </Button>
    </div>
  );
};

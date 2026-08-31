"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ClipboardClock,
  Clock3,
  Filter,
  Package,
  PencilLine,
  Plus,
  ShelvingUnit,
  WalletCards,
} from "lucide-react";
import { StockPageHeader } from "@/app/stock/layout";
import { AdjustStockDialog } from "@/components/adjust-stock-dialog";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { analyticsApi, reportsApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { StockMovementType } from "@/lib/api/types";
import { formatCompactCurrency, formatRelativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const movementTone: Record<StockMovementType, string> = {
  INBOUND: "bg-primary/20 text-[#556500]",
  OUTBOUND: "text-ink bg-[#f1f3f2]",
  ADJUSTMENT: "bg-[#767961]/20 text-[#767961]",
};

const movementIcon: Record<StockMovementType, typeof ArrowDown> = {
  INBOUND: ArrowDown,
  OUTBOUND: ArrowUp,
  ADJUSTMENT: PencilLine,
};

const formatSignedSqm = (changeAreaSqm: number) =>
  `${changeAreaSqm > 0 ? "+" : changeAreaSqm < 0 ? "−" : ""}${Math.abs(changeAreaSqm).toLocaleString()} sqm`;

const KpiCard = ({
  icon: Icon,
  label,
  value,
  valueTone = "text-ink",
}: {
  icon: typeof WalletCards;
  label: string;
  value: ReactNode;
  valueTone?: string;
}) => (
  <article className="rounded-2xl bg-white p-6 transition-all duration-300 sm:p-7 active:scale-95 cursor-pointer">
    <div className="flex items-start justify-between gap-3">
      <Icon className="size-6 text-ink" strokeWidth={1.8} />
    </div>
    <p className="mt-8 text-xs font-medium tracking-[0.6px] text-[#71809a] uppercase">
      {label}
    </p>
    <p className={`mt-1 text-3xl font-black leading-10 tracking-tight ${valueTone}`}>
      {value}
    </p>
  </article>
);

const OverviewKpiSkeleton = () => (
  <Skeleton className="mt-3 h-10 w-24" />
);

const AlertSkeleton = () => (
  <div className="grid gap-4 sm:grid-cols-2">
    {[0, 1].map((item) => (
      <div key={item} className="flex items-center gap-4 rounded-xl border border-[#e5e5e5] bg-card p-4">
        <Skeleton className="size-20 shrink-0 rounded-md sm:size-24" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    ))}
  </div>
);

const MovementSkeleton = () => (
  <div className="space-y-4 px-5 pb-6 sm:px-6">
    {[0, 1, 2].map((item) => (
      <div key={item} className="flex items-center justify-between gap-4 border-b border-[#e7e8e7] pb-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
    ))}
  </div>
);

const FulfillmentSkeleton = () => (
  <div className="space-y-4 px-5 pb-6 sm:px-6">
    {[0, 1].map((item) => (
      <div key={item} className="rounded-xl border border-[#e5e7eb] p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-3 w-24" />
      </div>
    ))}
  </div>
);

const StockOverviewPage = () => {
  const overview = useApi(() => analyticsApi.overview());
  const fulfillment = useApi(() => reportsApi.fulfillmentQueue());
  const lowStock = useApi(() => reportsApi.lowStock());
  const movements = useApi(() => reportsApi.stockMovements({ limit: 3 }));

  const pendingFulfillments =
    fulfillment.data?.byStatus.reduce((sum, row) => sum + row.count, 0) ?? 0;
  const criticalAlerts = lowStock.data?.slice(0, 2) ?? [];
  const queuedOrders = fulfillment.data?.orders.slice(0, 2) ?? [];

  return (
    <>
      <StockPageHeader
        title="Overview"
        subtitle="Real-time inventory metrics and critical alerts."
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href="/stock/inventory"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#dce2e9] bg-card px-4 py-3 text-sm font-semibold text-ink shadow-sm hover:bg-secondary"
          >
            <PencilLine className="size-4" />
            Manual Adjust
          </Link>
          <Link
            href="/stock/inventory/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          >
            <Plus className="size-4" />
            Add Product
          </Link>
        </div>
      </StockPageHeader>

      <div className="mt-7 space-y-6 sm:mt-8 sm:space-y-7">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={WalletCards}
            label="Total Inventory Value"
            value={
              overview.loading
                ? <OverviewKpiSkeleton />
                : formatCompactCurrency(overview.data?.totalInventoryValue ?? 0)
            }
          />
          <KpiCard
            icon={ShelvingUnit}
            label="Active Products"
            value={overview.loading ? <OverviewKpiSkeleton /> : (overview.data?.activeProducts.toLocaleString() ?? "0")}
          />
          <KpiCard
            icon={ClipboardClock}
            label="Pending Fulfillments"
            value={fulfillment.loading ? <OverviewKpiSkeleton /> : pendingFulfillments.toLocaleString()}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Low Stock Items"
            value={overview.loading ? <OverviewKpiSkeleton /> : (overview.data?.lowStockItems.toLocaleString() ?? "0")}
            valueTone="text-[#b86a00]"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-red-200 bg-[#fffafa]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-red-200 bg-[#fff3f3] px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <AlertTriangle className="size-6 shrink-0 text-red-500" />
              <h2 className="truncate text-xl font-bold text-ink sm:text-2xl">
                Critical Low Stock Alerts
              </h2>
            </div>
            {!lowStock.loading && !lowStock.error && (
              <span className="hidden items-center gap-2 text-xs font-bold text-ink sm:flex">
                <span className="size-2 rounded-full bg-red-500" />
                {lowStock.data?.length ?? 0} Action{(lowStock.data?.length ?? 0) === 1 ? "" : "s"} Required
              </span>
            )}
            <Link
              href="/stock/inventory"
              className="shrink-0 text-xs font-bold text-ink hover:underline"
            >
              View all alerts in Inventory
            </Link>
          </div>
          <div className="p-5 sm:p-6">
            {lowStock.loading ? (
              <AlertSkeleton />
            ) : lowStock.error ? (
              <ApiErrorState message={lowStock.error} onRetry={lowStock.reload} />
            ) : criticalAlerts.length === 0 ? (
              <ApiEmptyState message="No products are currently low on stock." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {criticalAlerts.map((alert) => (
                  <article
                    key={alert.productId}
                    className="flex min-w-0 items-center gap-4 rounded-xl border border-[#e5e5e5] bg-card p-4 shadow-sm"
                  >
                    <div
                      className="size-20 shrink-0 rounded-md border border-[#e4e5e3] bg-cover bg-center sm:size-24"
                      style={{ backgroundImage: `url(${alert.image})` }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-ink">{alert.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">SKU {alert.sku}</p>
                      <div className="mt-2">
                        <AdjustStockDialog
                          productId={alert.productId}
                          productName={alert.name}
                          currentStockSqm={alert.quantityOnHandSqm}
                          onAdjusted={() => {
                            void lowStock.reload();
                            void overview.reload();
                            void movements.reload();
                          }}
                          renderTrigger={
                            <button
                              type="button"
                              className="inline-block rounded-md bg-primary px-3 py-2 text-[11px] font-bold tracking-wide text-primary-foreground uppercase hover:brightness-95"
                            />
                          }
                          triggerContent="Adjust Stock"
                        />
                      </div>
                    </div>
                    <span
                      className={`self-start rounded-md px-2.5 py-2 text-xs font-bold ${
                        alert.stockStatus === "out_of_stock"
                          ? "text-red-600 bg-red-50"
                          : "text-amber-700 bg-amber-50"
                      }`}
                    >
                      {alert.quantityOnHandSqm.toLocaleString()} sqm
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[1.35fr_1fr]">
          <section className="overflow-hidden rounded-2xl bg-card">
            <div className="flex items-center justify-between gap-3 px-5 py-6 sm:px-6">
              <div>
                <h2 className="text-2xl font-bold text-ink">
                  Recent Movements
                </h2>
                <p className="mt-0.5 text-xs text-[#71809a]">
                  Latest inbound/outbound/adjustment activity.
                </p>
              </div>
              <Link
                href="/stock/reports"
                className="text-xs font-bold text-ink hover:underline"
              >
                View All
              </Link>
            </div>
            {movements.loading ? (
              <MovementSkeleton />
            ) : movements.error ? (
              <ApiErrorState message={movements.error} onRetry={movements.reload} className="mx-5 mb-6" />
            ) : (movements.data?.items.length ?? 0) === 0 ? (
              <ApiEmptyState message="No stock movements yet." className="mx-5 mb-6" />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <Table className="min-w-140">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty (sqm)</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.data!.items.map((movement) => {
                        const Icon = movementIcon[movement.type];
                        return (
                          <TableRow key={movement.id} className="hover:bg-secondary/40">
                            <TableCell>
                              <p className="font-bold text-sm text-ink">{movement.product.name}</p>
                              <p className="mt-1 text-xs text-ink font-medium">
                                {movement.reference ?? movement.product.sku}
                              </p>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${movementTone[movement.type]}`}
                              >
                                <Icon className="size-3.5" />
                                {movement.type}
                              </span>
                            </TableCell>
                            <TableCell
                              className={`font-data ${movement.changeAreaSqm < 0 ? "text-red-600" : "text-ink"}`}
                            >
                              {formatSignedSqm(movement.changeAreaSqm)}
                            </TableCell>
                            <TableCell className="text-xs text-[#71809a]">
                              {formatRelativeTime(movement.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <ul className="divide-y divide-[#e7e8e7] md:hidden">
                  {movements.data!.items.map((movement) => {
                    const Icon = movementIcon[movement.type];
                    return (
                      <li
                        key={movement.id}
                        className="flex items-start justify-between gap-3 px-5 py-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-ink">{movement.product.name}</p>
                          <p className="mt-1 text-xs text-[#71809a]">
                            {movement.reference ?? movement.product.sku} • {formatRelativeTime(movement.createdAt)}
                          </p>
                          <span
                            className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${movementTone[movement.type]}`}
                          >
                            <Icon className="size-3.5" />
                            {movement.type}
                          </span>
                        </div>
                        <span className="font-data text-sm font-semibold text-ink">
                          {formatSignedSqm(movement.changeAreaSqm)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl bg-card">
            <div className="flex items-center justify-between gap-3 px-5 py-6 sm:px-6">
              <div>
                <h2 className="text-2xl font-bold text-ink">
                  Fulfillment Queue
                </h2>
                <p className="mt-0.5 text-xs text-[#71809a]">
                  Orders requiring warehouse processing.
                </p>
              </div>
              <Link
                href="/stock/orders"
                aria-label="Filter fulfillment queue"
                className="rounded-lg border border-border p-2 text-ink hover:bg-secondary"
              >
                <Filter className="size-4" />
              </Link>
            </div>
            <div className="px-5 pb-6 sm:px-6">
              {fulfillment.loading ? (
                <FulfillmentSkeleton />
              ) : fulfillment.error ? (
                <ApiErrorState message={fulfillment.error} onRetry={fulfillment.reload} />
              ) : queuedOrders.length === 0 ? (
                <ApiEmptyState message="Nothing awaiting fulfilment." />
              ) : (
                <ul className="space-y-4">
                  {queuedOrders.map((order, index) => (
                    <li
                      key={order.id}
                      className="rounded-xl border border-[#e5e7eb] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${index === 0 ? "bg-[#eff9b6] text-[#587000]" : "bg-[#f1f3f2] text-[#758080]"}`}
                        >
                          <Package className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-ink">{order.orderNumber}</p>
                          <p className="mt-0.5 truncate text-xs text-[#71809a]">
                            {order.items?.length ?? 0} item{(order.items?.length ?? 0) === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${index === 0 ? "bg-primary text-primary-foreground" : "text-ink"}`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[#e5e7eb] pt-3 text-xs">
                        <span className="flex items-center gap-1.5 text-[#60718b]">
                          <Clock3 className="size-3.5" />
                          {formatRelativeTime(order.createdAt)}
                        </span>
                        <Link
                          href={`/stock/orders/${order.id}`}
                          className="font-bold text-ink hover:underline"
                        >
                          Process <ChevronRight className="inline size-3.5" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default StockOverviewPage;

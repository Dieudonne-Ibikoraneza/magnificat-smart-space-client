"use client";

import Link from "next/link";
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
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { StockPageHeader } from "@/app/stock/layout";
import { products } from "@/data/catalog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const lowStockAlerts = [
  {
    name: "Calacatta Gold",
    description: "Carrara White Polished Marble series",
    quantity: "2 boxes",
    tone: "text-red-600 bg-red-50",
    image: products[0].image,
  },
  {
    name: "Nero Marquina",
    description: "Carrara White Polished Marble series",
    quantity: "45 boxes",
    tone: "text-amber-700 bg-amber-50",
    image: products[1].image,
  },
];

const movements = [
  {
    item: "Carrara White Slab",
    reference: "PO-2023-089",
    type: "Inbound",
    quantity: "+12 boxes",
    time: "10 min ago",
    tone: "bg-primary/20 text-[#556500]",
    icon: ArrowDown,
  },
  {
    item: "Absolute Black Granite",
    reference: "ORD-9921",
    type: "Outbound",
    quantity: "−3 boxes",
    time: "1 hr ago",
    tone: "text-ink",
    icon: ArrowUp,
  },
  {
    item: "Statuario Mosaics",
    reference: "Adj-User-JD",
    type: "Adjustment",
    quantity: "−1 box",
    time: "3 hrs ago",
    tone: "bg-[#767961]/20 text-[#767961]",
    icon: PencilLine,
  },
];

const fulfillmentQueue = [
  {
    id: "ORD-9925",
    detail: "Standard Shipping • 3 Items",
    status: "Picking",
    due: "Due in 2 hrs",
    active: true,
  },
  {
    id: "ORD-9926",
    detail: "Freight • 12 Items (Pallet)",
    status: "Awaiting Pick",
    due: "Due Tomorrow",
    active: false,
  },
];

const KpiCard = ({
  icon: Icon,
  label,
  value,
  valueTone = "text-ink",
  trend,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  valueTone?: string;
  trend?: string;
}) => (
  <article className="rounded-2xl bg-white p-6 transition-all duration-300 sm:p-7 active:scale-95 cursor-pointer">
    <div className="flex items-start justify-between gap-3">
      <Icon className="size-6 text-ink" strokeWidth={1.8} />
      {trend && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eff9b6] px-2.5 py-1 text-xs font-bold text-[#617500]">
          <TrendingUp className="size-3.5" strokeWidth={2.2} />
          {trend}
        </span>
      )}
    </div>
    <p className="mt-8 text-xs font-medium tracking-[0.6px] text-[#71809a] uppercase">
      {label}
    </p>
    <p className={`mt-1 text-3xl font-black leading-10 tracking-tight ${valueTone}`}>
      {value}
    </p>
  </article>
);

const StockOverviewPage = () => {
  return (
    <>
      <StockPageHeader
        title="Overview"
        subtitle="Real-time inventory metrics and critical alerts."
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#dce2e9] bg-card px-4 py-3 text-sm font-semibold text-ink shadow-sm hover:bg-secondary"
          >
            <PencilLine className="size-4" />
            Manual Adjust
          </button>
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          >
            <Plus className="size-4" />
            Add Product
          </button>
        </div>
      </StockPageHeader>

      <div className="mt-7 space-y-6 sm:mt-8 sm:space-y-7">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={WalletCards}
            label="Total Inventory Value"
            value="$1.24M"
            trend="2.4%"
          />
          <KpiCard icon={ShelvingUnit} label="Active Products" value="842" />
          <KpiCard
            icon={ClipboardClock}
            label="Pending Fulfillments"
            value="28"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Low Stock Items"
            value="12"
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
            <span className="hidden items-center gap-2 text-xs font-bold text-ink sm:flex">
              <span className="size-2 rounded-full bg-red-500" />3 Action
              Required
            </span>
            <Link
              href="/stock/inventory"
              className="shrink-0 text-xs font-bold text-ink hover:underline"
            >
              View all alerts in Inventory
            </Link>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            {lowStockAlerts.map((alert) => (
              <article
                key={alert.name}
                className="flex min-w-0 items-center gap-4 rounded-xl border border-[#e5e5e5] bg-card p-4 shadow-sm"
              >
                <div
                  className="size-20 shrink-0 rounded-md border border-[#e4e5e3] bg-cover bg-center sm:size-24"
                  style={{ backgroundImage: `url(${alert.image})` }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-ink">
                    {alert.name}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    Inspired by the timeless quarries of Italy, our{" "}
                    <strong>{alert.description}</strong> brings a sense of
                    elegance.
                  </p>
                  <button
                    type="button"
                    className="mt-2 rounded-md bg-primary px-3 py-2 text-[11px] font-bold tracking-wide text-primary-foreground uppercase hover:brightness-95"
                  >
                    Adjust Stock
                  </button>
                </div>
                <span
                  className={`self-start rounded-md px-2.5 py-2 text-xs font-bold ${alert.tone}`}
                >
                  {alert.quantity}
                </span>
              </article>
            ))}
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
                  Last 24 hours of inbound/outbound activity.
                </p>
              </div>
              <Link
                href="/stock/reports"
                className="text-xs font-bold text-ink hover:underline"
              >
                View All
              </Link>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-140">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty (Boxes)</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(
                    ({
                      item,
                      reference,
                      type,
                      quantity,
                      time,
                      tone,
                      icon: Icon,
                    }) => (
                      <TableRow key={reference} className="hover:bg-secondary/40">
                        <TableCell>
                          <p className="font-bold text-sm text-ink">{item}</p>
                          <p className="mt-1 text-xs text-ink  font-medium">
                            {reference}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
                          >
                            <Icon className="size-3.5" />
                            {type}
                          </span>
                        </TableCell>
                        <TableCell
                          className={`font-data ${quantity.startsWith("−") ? "text-red-600" : "text-ink"}`}
                        >
                          {quantity}
                        </TableCell>
                        <TableCell className="text-xs text-[#71809a]">
                          {time}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y divide-[#e7e8e7] md:hidden">
              {movements.map(
                ({
                  item,
                  reference,
                  type,
                  quantity,
                  time,
                  tone,
                  icon: Icon,
                }) => (
                  <li
                    key={reference}
                    className="flex items-start justify-between gap-3 px-5 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">{item}</p>
                      <p className="mt-1 text-xs text-[#71809a]">
                        {reference} • {time}
                      </p>
                      <span
                        className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${tone}`}
                      >
                        <Icon className="size-3.5" />
                        {type}
                      </span>
                    </div>
                    <span className="font-data text-sm font-semibold text-ink">
                      {quantity}
                    </span>
                  </li>
                ),
              )}
            </ul>
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
              <button
                type="button"
                aria-label="Filter fulfillment queue"
                className="rounded-lg border border-border p-2 text-ink hover:bg-secondary"
              >
                <Filter className="size-4" />
              </button>
            </div>
            <ul className="space-y-4 px-5 pb-6 sm:px-6">
              {fulfillmentQueue.map((order) => (
                <li
                  key={order.id}
                  className="rounded-xl border border-[#e5e7eb] p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${order.active ? "bg-[#eff9b6] text-[#587000]" : "bg-[#f1f3f2] text-[#758080]"}`}
                    >
                      <Package className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{order.id}</p>
                      <p className="mt-0.5 truncate text-xs text-[#71809a]">
                        {order.detail}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${order.active ? "bg-primary text-primary-foreground" : "text-ink"}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-[#e5e7eb] pt-3 text-xs">
                    <span className="flex items-center gap-1.5 text-[#60718b]">
                      <Clock3 className="size-3.5" />
                      {order.due}
                    </span>
                    <Link
                      href="/stock/orders"
                      className="font-bold text-ink hover:underline"
                    >
                      Process <ChevronRight className="inline size-3.5" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
};

export default StockOverviewPage;

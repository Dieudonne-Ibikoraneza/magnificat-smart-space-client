"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Grid3X3,
  LayoutList,
  ListFilter,
  Menu,
  Search,
} from "lucide-react";
import { useStockMenu } from "@/app/stock/layout";
import { StaffCreatedIndicator } from "@/components/staff-created-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { salesOrders, type SalesOrderStatus } from "@/data/sales-orders";
import type { BadgeProps } from "@/components/ui/badge";

type OrderSort = "newest" | "oldest" | "amount-high" | "amount-low";

const getOrderStatusVariant = (status: SalesOrderStatus): NonNullable<BadgeProps["variant"]> =>
  ({
    Processing: "secondary",
    Shipped: "primary",
    Delivered: "muted",
  } as const)[status];

const totalSqm = (items: { quantity: string }[]) =>
  items.reduce(
    (total, item) => total + Number(item.quantity.replace(/[^0-9.]/g, "")),
    0,
  );

const OrdersPage = () => {
  const { openMenu } = useStockMenu();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<OrderSort>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredOrders = salesOrders.filter(
      (order) =>
        (status === "all" || order.status.toLowerCase() === status) &&
        (normalizedQuery === "" ||
          order.id.toLowerCase().includes(normalizedQuery) ||
          order.customerName.toLowerCase().includes(normalizedQuery)),
    );

    return [...filteredOrders].sort((first, second) => {
      if (sort === "newest")
        return new Date(second.date).getTime() - new Date(first.date).getTime();
      if (sort === "oldest")
        return new Date(first.date).getTime() - new Date(second.date).getTime();
      const firstAmount = Number(first.amount.replace(/[^0-9]/g, ""));
      const secondAmount = Number(second.amount.replace(/[^0-9]/g, ""));
      return sort === "amount-high"
        ? secondAmount - firstAmount
        : firstAmount - secondAmount;
    });
  }, [query, sort, status]);

  return (
    <>
      <header className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Open menu" onClick={openMenu} className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-ink hover:bg-secondary lg:hidden"><Menu className="size-5" /></button><div className="min-w-0"><h1 className="truncate text-xl font-bold text-ink sm:text-2xl">Orders</h1><p className="mt-1 hidden text-sm text-muted-foreground sm:block">Monitor progress and manage customer transaction history.</p></div></div><button type="button" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:px-6 sm:py-3.5">New Order</button></header>
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        <section className="rounded-2xl bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-ink">
              <ListFilter className="size-5" strokeWidth={1.8} />
              Filter by:
            </div>
            <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:min-w-[320px] sm:flex-1 lg:w-auto lg:flex-none lg:gap-5">
              <Select
                value={status}
                onValueChange={(value) => setStatus(value ?? "all")}
              >
                <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                  <SelectValue className="truncate">
                    {(value) =>
                      value === "all" ? "Status: All" : "Status: " + value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status: All</SelectItem>
                  <SelectItem value="processing">Status: Processing</SelectItem>
                  <SelectItem value="shipped">Status: Shipped</SelectItem>
                  <SelectItem value="delivered">Status: Delivered</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sort}
                onValueChange={(value) =>
                  setSort((value as OrderSort) ?? "newest")
                }
              >
                <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                  <SelectValue className="truncate">
                    {(value) =>
                      value === "oldest"
                        ? "Date: Oldest"
                        : value === "amount-high"
                          ? "Amount: High"
                          : value === "amount-low"
                            ? "Amount: Low"
                            : "Date: Newest"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Order Date: Newest</SelectItem>
                  <SelectItem value="oldest">Order Date: Oldest</SelectItem>
                  <SelectItem value="amount-high">
                    Amount: High to Low
                  </SelectItem>
                  <SelectItem value="amount-low">
                    Amount: Low to High
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 lg:mx-2">
              <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by order ID or customer..."
                aria-label="Search orders"
                className="w-full rounded-full border border-border bg-[#F9FAFB] py-3 pr-4 pl-11 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex items-center justify-between gap-4 lg:justify-end">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Showing {results.length} result{results.length === 1 ? "" : "s"}
              </p>
              <div className="flex items-center rounded-lg border border-border bg-background p-1">
                <Button
                  type="button"
                  variant={view === "grid" ? "default" : "ghost"}
                  size="icon-xs"
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                >
                  <Grid3X3 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={view === "list" ? "default" : "ghost"}
                  size="icon-xs"
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <LayoutList className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {results.length === 0 ? (
          <p className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
            No orders match your filters.
          </p>
        ) : view === "grid" ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((order) => (
              <li key={order.id}>
                <article className="group flex h-full flex-col rounded-2xl bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        #{order.id}
                      </p>
                      <h2 className="mt-1 truncate text-base font-bold text-ink">
                        {order.customerName}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.createdByType === "staff" && (
                        <StaffCreatedIndicator createdByName={order.createdByName} />
                      )}
                      <Badge variant={getOrderStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="my-4 h-px bg-[#E5E7EB]" />
                  <dl className="space-y-3 font-data text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Summary</dt>
                      <dd className="text-right font-semibold text-ink">
                        {order.items.length} Products
                        <span className="block text-xs font-normal text-muted-foreground">
                          {totalSqm(order.items).toLocaleString("en-US")} sqm
                          total
                        </span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Order Date</dt>
                      <dd className="font-semibold text-ink">{order.date}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Total Spend</dt>
                      <dd className="font-semibold text-ink">{order.amount}</dd>
                    </div>
                  </dl>
                  <Button
                    type="button"
                    onClick={() => router.push("/stock/orders/" + order.id)}
                    className="mt-5 h-auto w-full gap-2 rounded-lg py-3 text-sm font-bold"
                  >
                    View Details{" "}
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <section className="overflow-hidden rounded-2xl bg-card">
            <ul className="divide-y divide-[#E5E7EB] md:hidden">
              {results.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => router.push("/stock/orders/" + order.id)}
                    className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left font-data hover:bg-secondary/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {order.id}
                      </p>
                      <p className="text-sm text-ink">{order.customerName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {order.date}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm font-semibold text-ink">
                        {order.amount}
                      </p>
                      <div className="flex items-center gap-2">
                        {order.createdByType === "staff" && (
                          <StaffCreatedIndicator createdByName={order.createdByName} />
                        )}
                        <Badge variant={getOrderStatusVariant(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((order) => (
                    <TableRow
                      key={order.id}
                      role="link"
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() => router.push("/stock/orders/" + order.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push("/stock/orders/" + order.id);
                        }
                      }}
                    >
                      <TableCell className="font-semibold">
                        {order.id}
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {order.date}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-semibold">
                        {order.amount}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {order.createdByType === "staff" && (
                            <StaffCreatedIndicator createdByName={order.createdByName} />
                          )}
                          <Badge variant={getOrderStatusVariant(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default OrdersPage;

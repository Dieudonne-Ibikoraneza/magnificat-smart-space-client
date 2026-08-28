"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Grid3X3,
  LayoutList,
  ListFilter,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
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
import { cn } from "@/lib/utils";

type OrderSort = "newest" | "oldest" | "amount-high" | "amount-low";
type DateFilter =
  "all" | "today" | "yesterday" | "last7" | "last30" | "month" | "custom";

const dateFilterLabels: Record<DateFilter, string> = {
  all: "Date: All Time",
  today: "Date: Today",
  yesterday: "Date: Yesterday",
  last7: "Date: Last 7 Days",
  last30: "Date: Last 30 Days",
  month: "Date: This Month",
  custom: "Date: Custom",
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const matchesDateFilter = (
  orderDate: Date,
  filter: DateFilter,
  customDate: string,
) => {
  if (filter === "all") return true;
  const now = new Date();

  if (filter === "today") return isSameDay(orderDate, now);

  if (filter === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(orderDate, yesterday);
  }

  if (filter === "last7") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 7);
    return orderDate >= cutoff && orderDate <= now;
  }

  if (filter === "last30") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    return orderDate >= cutoff && orderDate <= now;
  }

  if (filter === "month") {
    return (
      orderDate.getFullYear() === now.getFullYear() &&
      orderDate.getMonth() === now.getMonth()
    );
  }

  if (filter === "custom" && customDate) {
    const [year, month, day] = customDate.split("-").map(Number);
    return isSameDay(orderDate, new Date(year, month - 1, day));
  }

  return true;
};

const getOrderStatusVariant = (
  status: SalesOrderStatus,
): NonNullable<BadgeProps["variant"]> =>
  (
    ({
      Processing: "secondary",
      Shipped: "primary",
      Delivered: "muted",
    }) as const
  )[status];

const totalSqm = (items: { quantity: string }[]) =>
  items.reduce(
    (total, item) => total + Number(item.quantity.replace(/[^0-9.]/g, "")),
    0,
  );

const SEARCH_MENU_ANIMATION_MS = 200;

const OrderSearchMenu = ({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setClosing(false);
    } else {
      setClosing(true);
    }
  }

  useEffect(() => {
    if (!closing) return;
    const timeout = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, SEARCH_MENU_ANIMATION_MS);
    return () => window.clearTimeout(timeout);
  }, [closing]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        className={cn(open && "bg-secondary text-ink")}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close order search" : "Search orders"}
        aria-expanded={open}
      >
        {open ? <X className="size-4" /> : <Search className="size-4" />}
      </Button>
      {mounted && (
        <div
          className={cn(
            "absolute top-full right-0 z-30 mt-2 w-72 origin-top-right rounded-2xl bg-white p-3 shadow-xl ring-1 ring-ink/10 duration-200 sm:w-80",
            closing
              ? "animate-out fade-out-0 slide-out-to-top-2"
              : "animate-in fade-in-0 slide-in-from-top-2",
          )}
        >
          <label htmlFor="orders-search" className="sr-only">
            Search orders
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="orders-search"
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search by order ID or customer..."
              className="w-full rounded-full border border-border bg-[#F9FAFB] py-2.5 pr-4 pl-10 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const OrdersPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDate, setCustomDate] = useState("");
  const [sort, setSort] = useState<OrderSort>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredOrders = salesOrders.filter(
      (order) =>
        (status === "all" || order.status.toLowerCase() === status) &&
        matchesDateFilter(new Date(order.date), dateFilter, customDate) &&
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
  }, [query, sort, status, dateFilter, customDate]);

  return (
    <>
      <AdminPageHeader
        title="Orders"
        subtitle="Monitor progress and manage customer transaction history."
      >
        <Button
          type="button"
          onClick={() => router.push("/admin/orders/new")}
          className="h-11 gap-2 bg-primary px-5 font-bold text-ink hover:bg-primary/90"
        >
          <UserPlus className="size-4" />
          New Order
        </Button>
      </AdminPageHeader>
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        <section className="rounded-2xl bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-ink">
                <ListFilter className="size-5" strokeWidth={1.8} />
                Filter by:
              </div>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value ?? "all")}
              >
                <SelectTrigger className="h-10 w-auto min-w-[130px] border-border bg-transparent text-sm font-medium">
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
                value={dateFilter}
                onValueChange={(value) => {
                  const next = (value as DateFilter) ?? "all";
                  setDateFilter(next);
                  if (next !== "custom") setCustomDate("");
                }}
              >
                <SelectTrigger className="h-10 w-auto min-w-[130px] border-border bg-transparent text-sm font-medium">
                  <SelectValue className="truncate">
                    {(value) => dateFilterLabels[value as DateFilter]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Date: All Time</SelectItem>
                  <SelectItem value="today">Date: Today</SelectItem>
                  <SelectItem value="yesterday">Date: Yesterday</SelectItem>
                  <SelectItem value="last7">Date: Last 7 Days</SelectItem>
                  <SelectItem value="last30">Date: Last 30 Days</SelectItem>
                  <SelectItem value="month">Date: This Month</SelectItem>
                  <SelectItem value="custom">Date: Custom...</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === "custom" && (
                <div className="relative flex shrink-0 items-center">
                  <CalendarDays className="pointer-events-none absolute left-4 size-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={customDate}
                    onChange={(event) => setCustomDate(event.target.value)}
                    aria-label="Pick a specific order date"
                    className="h-10 rounded-full border border-border bg-[#F9FAFB] py-2 pr-9 pl-11 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                  />
                  {customDate && (
                    <button
                      type="button"
                      onClick={() => setCustomDate("")}
                      aria-label="Clear custom date"
                      className="absolute right-2.5 flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-ink"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
              <Select
                value={sort}
                onValueChange={(value) =>
                  setSort((value as OrderSort) ?? "newest")
                }
              >
                <SelectTrigger className="h-10 w-auto min-w-[130px] border-border bg-transparent text-sm font-medium">
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
            <div className="flex shrink-0 items-center gap-3">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase whitespace-nowrap">
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
              <OrderSearchMenu query={query} onQueryChange={setQuery} />
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
                        <StaffCreatedIndicator
                          createdByName={order.createdByName}
                        />
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
                    onClick={() => router.push("/admin/orders/" + order.id)}
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
                    onClick={() => router.push("/admin/orders/" + order.id)}
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
                          <StaffCreatedIndicator
                            createdByName={order.createdByName}
                          />
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
                      onClick={() => router.push("/admin/orders/" + order.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push("/admin/orders/" + order.id);
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
                            <StaffCreatedIndicator
                              createdByName={order.createdByName}
                            />
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

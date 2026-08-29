"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Download, ListFilter } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ApiEmptyState, ApiErrorState } from "@/components/api-state";
import { CartSkeleton } from "@/components/skeletons";
import { getVisiblePages } from "@/lib/catalog-utils";
import { ordersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { ApiOrder, OrderStatus } from "@/lib/api/types";

type DateFilter = "all" | "30" | "90" | "year";

const formatPrice = (value: string | number) => `RWF ${Math.round(Number(value)).toLocaleString()}`;

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  READY_FOR_DISPATCH: "Ready for Dispatch",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const statusStyles: Record<OrderStatus, string> = {
  PENDING: "bg-secondary text-ink",
  PROCESSING: "bg-primary text-ink",
  READY_FOR_DISPATCH: "bg-[#fef3c7] text-[#92400e]",
  SHIPPED: "bg-[#dbeafe] text-[#1d4ed8]",
  DELIVERED: "bg-slate-100 text-ink",
  CANCELLED: "bg-red-50 text-red-600",
};

const ORDER_PAGE_SIZE = 5;

/** A stable, name-only summary of what's in the order — matches what the mock UI showed before real data. */
const productNamesOf = (order: ApiOrder) =>
  (order.items ?? []).map((item) => item.product?.name ?? "Item").filter(Boolean);

const imagesOf = (order: ApiOrder) =>
  (order.items ?? []).map((item) => item.product?.image).filter((image): image is string => !!image);

const OrdersPage = () => {
  const { data, loading, error, reload } = useApi(() => ordersApi.list({ limit: 100 }), []);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const orders = useMemo(() => data?.items ?? [], [data]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesStatus = filter === "all" || order.status === filter;
        if (!matchesStatus || dateFilter === "all") return matchesStatus;

        const orderDate = new Date(order.createdAt);
        const now = new Date();
        const startDate = new Date(now);
        if (dateFilter === "year") {
          startDate.setMonth(0, 1);
          startDate.setHours(0, 0, 0, 0);
        } else {
          startDate.setDate(now.getDate() - Number(dateFilter));
        }
        return orderDate >= startDate && orderDate <= now;
      }),
    [orders, dateFilter, filter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDER_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleOrders = filteredOrders.slice(
    (safePage - 1) * ORDER_PAGE_SIZE,
    safePage * ORDER_PAGE_SIZE,
  );
  const visiblePages = getVisiblePages(safePage, totalPages);

  const changeFilter = (value: string | null) => {
    setFilter((value as OrderStatus | "all") ?? "all");
    setCurrentPage(1);
  };

  const changeDateFilter = (value: string | null) => {
    setDateFilter((value as DateFilter) ?? "all");
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  const downloadHistory = () => {
    const csv = [
      "Order,Status,Date,Total",
      ...orders.map(
        (order) => `${order.orderNumber},${order.status},${order.createdAt},${order.total}`,
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "magnificat-order-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <CartSkeleton />;
  if (error) return <ApiErrorState message={error} onRetry={reload} className="my-16" />;

  return (
    <div className="mx-auto max-w-300">
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">My orders</h1>
          <p className="mt-1 text-sm text-ink">Track and manage your past architectural material orders.</p>
        </div>
        <div className="flex flex-wrap gap-3 sm:justify-end">
          <div className="group relative w-44">
            <span className="sr-only">Filter orders by status</span>
            <ListFilter className="pointer-events-none absolute left-4 top-1/2 z-10 size-[18px] -translate-y-1/2 text-ink transition-transform duration-200 group-hover:translate-x-0.5" />
            <Select value={filter} onValueChange={changeFilter}>
              <SelectTrigger className="h-10 rounded-md border-slate-200 bg-transparent pl-10 pr-3 text-sm font-semibold hover:border-slate-300 hover:bg-white [&>svg]:size-4">
                <SelectValue>{(value) => (value === "all" ? "Filter (All)" : `Filter (${statusLabels[value as OrderStatus]})`)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="w-48 rounded-xl border-slate-200 bg-white p-1.5 shadow-[0_14px_32px_rgba(15,39,71,0.16)]">
                <SelectItem value="all" className="rounded-lg py-2 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20">All</SelectItem>
                {(Object.keys(statusLabels) as OrderStatus[]).map((status) => (
                  <SelectItem key={status} value={status} className="rounded-lg py-2 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20">
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={dateFilter} onValueChange={changeDateFilter}>
            <SelectTrigger className="h-10 w-36 rounded-md border-slate-200 bg-transparent px-3 text-sm font-semibold hover:border-slate-300 hover:bg-white [&>svg]:size-4">
              <SelectValue>{(value) => value === "all" ? "Date (All)" : value === "year" ? "This year" : `Last ${value} days`}</SelectValue>
            </SelectTrigger>
            <SelectContent className="w-40 rounded-xl border-slate-200 bg-white p-1.5 shadow-[0_14px_32px_rgba(15,39,71,0.16)]">
              <SelectItem value="all" className="rounded-lg py-2 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20">Date (All)</SelectItem>
              <SelectItem value="30" className="rounded-lg py-2 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20">Last 30 days</SelectItem>
              <SelectItem value="90" className="rounded-lg py-2 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20">Last 90 days</SelectItem>
              <SelectItem value="year" className="rounded-lg py-2 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20">This year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={downloadHistory}
            disabled={orders.length === 0}
            className="group h-10 gap-2 px-4 text-sm font-bold disabled:pointer-events-auto disabled:cursor-not-allowed"
          >
            <Download className="size-[18px] transition-transform duration-200 group-hover:translate-y-0.5" />
            <span className="hidden sm:inline">Download History</span>
            <span className="sm:hidden">Download</span>
          </Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <ApiEmptyState message="You haven't placed any orders yet." className="my-16" />
      ) : (
        <>
          <div className="space-y-4">
            {visibleOrders.map((order) => {
              const images = imagesOf(order).slice(0, 2);
              const names = productNamesOf(order);
              return (
                <article key={order.id} className="rounded-3xl bg-white p-5 sm:p-6 lg:px-10 lg:py-7">
                  <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_240px] lg:items-center lg:gap-10">
                    <div className="flex h-24 w-fit shrink-0 gap-1 overflow-hidden">
                      {images.map((image, index) => (
                        <div key={`${order.id}-${index}`} className="relative size-24 shrink-0 bg-muted-background">
                          <Image src={image} alt="Order product" fill unoptimized className="object-cover" sizes="120px" />
                        </div>
                      ))}
                      {names.length > 2 && (
                        <div className="flex size-24 shrink-0 items-center justify-center bg-muted-background text-lg font-bold text-muted">
                          +{names.length - 2}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className={`rounded-md px-4 py-2 text-xs font-semibold ${statusStyles[order.status]}`}>
                          {statusLabels[order.status].toUpperCase()}
                        </span>
                        <span className="text-sm text-muted">#{order.orderNumber}</span>
                      </div>
                      <h2 className="mt-3 text-lg font-bold text-ink">
                        {names.slice(0, 2).join(", ")}
                        {names.length > 2 && <span className="text-base font-normal"> + {names.length - 2} more</span>}
                      </h2>
                      <div className="mt-7 flex gap-14 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted">Date</p>
                          <p className="mt-1 font-medium text-ink">
                            {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted">Total</p>
                          <p className="mt-1 font-bold text-ink">{formatPrice(order.total)}</p>
                        </div>
                      </div>
                    </div>

                    <Link href={`/account/orders/${order.id}`} className="group inline-flex h-10 w-full items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-ink lg:max-w-44 lg:self-end">
                      View Details <ArrowRight className="size-[18px] transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {visibleOrders.length === 0 && (
            <div className="rounded-3xl bg-white px-6 py-16 text-center text-sm text-muted">No orders found for this status.</div>
          )}

          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent className="gap-1 sm:gap-2">
                <PaginationItem>
                  <PaginationLink href="#" size="sm" className="gap-1 text-ink hover:text-amber" aria-disabled={safePage === 1} onClick={(event) => { event.preventDefault(); goToPage(1); }}>
                    <ArrowLeft className="size-4" /><span className="hidden sm:inline">First</span>
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationPrevious href="#" className="text-ink hover:text-amber" aria-disabled={safePage === 1} onClick={(event) => { event.preventDefault(); goToPage(safePage - 1); }} />
                </PaginationItem>
                {visiblePages.map((page, index) => page === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}><PaginationEllipsis /></PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink href="#" isActive={safePage === page} size="icon-sm" className={safePage === page ? "border-ink bg-ink text-white hover:bg-ink hover:text-white" : "text-ink hover:text-amber"} onClick={(event) => { event.preventDefault(); goToPage(page); }}>{page}</PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext href="#" className="text-ink hover:text-amber" aria-disabled={safePage === totalPages} onClick={(event) => { event.preventDefault(); goToPage(safePage + 1); }} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" size="sm" className="gap-1 text-ink hover:text-amber" aria-disabled={safePage === totalPages} onClick={(event) => { event.preventDefault(); goToPage(totalPages); }}>
                    <span className="hidden sm:inline">Last</span><ArrowRight className="size-4" />
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
};

export default OrdersPage;

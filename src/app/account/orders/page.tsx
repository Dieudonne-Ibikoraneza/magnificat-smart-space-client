"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Download, ListFilter } from "lucide-react";
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
import { getVisiblePages } from "@/lib/catalog-utils";

type OrderStatus = "Processing" | "Shipped" | "Delivered";
type DateFilter = "all" | "30" | "90" | "year";

type Order = {
  id: string;
  status: OrderStatus;
  products: string[];
  images: string[];
  date: string;
  total: number;
};

const orders: Order[] = [
  {
    id: "MGN-99201",
    status: "Processing",
    products: ["Calacatta Gold Polished", "Slate Zenith", "Carrara White Polished", "Travertine Beige"],
    images: [
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=240&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=240&q=85",
    ],
    date: "July 28, 2026",
    total: 2248500,
  },
  {
    id: "MGN-99202",
    status: "Shipped",
    products: ["Calacatta Gold Polished", "Slate Zenith"],
    images: [
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=240&q=85",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=240&q=85",
    ],
    date: "July 28, 2026",
    total: 2248500,
  },
  {
    id: "MGN-99203",
    status: "Delivered",
    products: ["Calacatta Gold Polished", "Carrara White Polished"],
    images: [
      "https://images.unsplash.com/photo-1615529162924-f8605388461d?auto=format&fit=crop&w=240&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=240&q=85&sat=-20",
    ],
    date: "July 28, 2026",
    total: 2248500,
  },
];

const formatPrice = (value: number) => `RWF ${value.toLocaleString()}`;

const statusStyles: Record<OrderStatus, string> = {
  Processing: "bg-primary text-ink",
  Shipped: "bg-[#dbeafe] text-[#1d4ed8]",
  Delivered: "bg-slate-100 text-ink",
};

const ORDER_PAGE_SIZE = 3;

const OrdersPage = () => {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredOrders = useMemo(
    () => orders.filter((order) => {
      const matchesStatus = filter === "all" || order.status === filter;
      if (!matchesStatus || dateFilter === "all") return matchesStatus;

      const orderDate = new Date(order.date);
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
    [dateFilter, filter],
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
      ...orders.map((order) => `${order.id},${order.status},${order.date},${order.total}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "magnificat-order-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

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
                <SelectValue>{(value) => value === "all" ? "Filter (All)" : `Filter (${value})`}</SelectValue>
              </SelectTrigger>
              <SelectContent className="w-44 rounded-xl border-slate-200 bg-white p-1.5 shadow-[0_14px_32px_rgba(15,39,71,0.16)]">
                <SelectItem value="all" className="rounded-lg py-2 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20">Filter</SelectItem>
                <SelectItem value="Processing" className="rounded-lg py-2 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20">Processing</SelectItem>
                <SelectItem value="Shipped" className="rounded-lg py-2 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20">Shipped</SelectItem>
                <SelectItem value="Delivered" className="rounded-lg py-2 text-sm data-[highlighted]:bg-primary/20 data-[selected]:bg-primary/20">Delivered</SelectItem>
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
          <Button type="button" onClick={downloadHistory} className="group h-10 gap-2 px-4 text-sm font-bold">
            <Download className="size-[18px] transition-transform duration-200 group-hover:translate-y-0.5" />
            <span className="hidden sm:inline">Download History</span>
            <span className="sm:hidden">Download</span>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {visibleOrders.map((order) => (
          <article key={order.id} className="rounded-3xl bg-white p-5 sm:p-6 lg:px-10 lg:py-7">
            <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_240px] lg:items-center lg:gap-10">
              <div className="flex h-24 w-fit shrink-0 gap-1 overflow-hidden">
                {order.images.map((image) => (
                  <div key={image} className="relative size-24 shrink-0 bg-muted-background">
                    <Image src={image} alt="Order product" fill unoptimized className="object-cover" sizes="120px" />
                  </div>
                ))}
                {order.products.length > 2 && (
                  <div className="flex size-24 shrink-0 items-center justify-center bg-muted-background text-lg font-bold text-muted">
                    +{order.products.length - 2}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-4">
                  <span className={`rounded-md px-4 py-2 text-xs font-semibold ${statusStyles[order.status]}`}>{order.status.toUpperCase()}</span>
                  <span className="text-sm text-muted">#{order.id}</span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-ink">{order.products.slice(0, 2).join(", ")}{order.products.length > 2 && <span className="text-base font-normal"> + {order.products.length - 2} more</span>}</h2>
                <div className="mt-7 flex gap-14 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Date</p>
                    <p className="mt-1 font-medium text-ink">{order.date}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Total</p>
                    <p className="mt-1 font-bold text-ink">{formatPrice(order.total)}</p>
                  </div>
                </div>
              </div>

              <Button type="button" variant="outline" className="group h-10 w-full justify-center gap-3 border-slate-200 bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-ink lg:max-w-44 lg:self-end">
                View Details <ArrowRight className="size-[18px] transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </div>
          </article>
        ))}
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
    </div>
  );
};

export default OrdersPage;

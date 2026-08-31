"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListFilter, Search, ShoppingCart } from "lucide-react";
import { StockPageHeader } from "@/app/stock/layout";
import { ApiEmptyState, ApiErrorState, ApiLoading } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { UserStatus } from "@/lib/api/types";
import { formatCompactCurrency, formatRelativeTime } from "@/lib/utils";

const statusBadge: Record<UserStatus, "primary" | "muted" | "destructive"> = {
  ACTIVE: "primary",
  INACTIVE: "muted",
  SUSPENDED: "destructive",
};

/**
 * Read-only view — stock managers can look customers up and start an order
 * on their behalf, but customer management itself (editing, suspending)
 * stays with admin/sales.
 */
const StockCustomersPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | UserStatus>("all");
  const [sort, setSort] = useState<"newest" | "name">("newest");

  const { data, loading, error, reload } = useApi(() => usersApi.listCustomers({ limit: 100 }));
  const customers = useMemo(() => data?.items ?? [], [data]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = customers.filter(
      (customer) =>
        (status === "all" || customer.status === status) &&
        (normalizedQuery === "" ||
          customer.fullName.toLowerCase().includes(normalizedQuery) ||
          (customer.email ?? "").toLowerCase().includes(normalizedQuery)),
    );
    return sort === "name" ? [...filtered].sort((a, b) => a.fullName.localeCompare(b.fullName)) : filtered;
  }, [customers, query, status, sort]);

  return (
    <>
      <StockPageHeader title="Customers" subtitle="Look a customer up and start an order on their behalf." />
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        <section className="rounded-2xl bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-ink">
              <ListFilter className="size-5 shrink-0" strokeWidth={1.8} />
              <span>Filter by:</span>
            </div>
            <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:min-w-[320px] sm:flex-1 lg:w-auto lg:flex-none lg:gap-5">
              <div className="min-w-0">
                <span className="sr-only">Status</span>
                <Select value={status} onValueChange={(value) => setStatus((value ?? "all") as "all" | UserStatus)}>
                  <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                    <SelectValue className="min-w-0 truncate">
                      {(value) => (value === "all" ? "Status: All" : `Status: ${value === "ACTIVE" ? "Active" : value === "INACTIVE" ? "Inactive" : "Suspended"}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status: All</SelectItem>
                    <SelectItem value="ACTIVE">Status: Active</SelectItem>
                    <SelectItem value="INACTIVE">Status: Inactive</SelectItem>
                    <SelectItem value="SUSPENDED">Status: Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <span className="sr-only">Sort</span>
                <Select value={sort} onValueChange={(value) => setSort((value ?? "newest") as "newest" | "name")}>
                  <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                    <SelectValue className="min-w-0 truncate">{(value) => (value === "name" ? "Name: A - Z" : "Joined: Newest")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Joined Date: Newest</SelectItem>
                    <SelectItem value="name">Name: A - Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative flex-1 lg:mx-2">
              <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by customer name, email..."
                aria-label="Search customers"
                className="w-full rounded-full border border-border bg-[#F9FAFB] py-3 pr-4 pl-11 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <p className="shrink-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase lg:hidden xl:inline">
              Showing {results.length} result{results.length === 1 ? "" : "s"}
            </p>
          </div>
        </section>

        {loading ? (
          <ApiLoading label="Loading customers…" className="py-24" />
        ) : error ? (
          <ApiErrorState message={error} onRetry={reload} className="my-16" />
        ) : results.length === 0 ? (
          <ApiEmptyState message="No customers match your filters." className="py-16" />
        ) : (
          <ul className="grid gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {results.map((customer) => (
              <li key={customer.id} className="flex flex-col rounded-2xl bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 truncate text-xl font-bold text-ink">{customer.fullName}</h2>
                  <Badge variant={statusBadge[customer.status]}>{customer.status}</Badge>
                </div>
                <dl className="mt-5 space-y-3 border-t border-[#E5E7EB] pt-4 font-data text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Contact</dt>
                    <dd className="min-w-0 text-right text-ink">
                      <span className="block truncate">{customer.email ?? "—"}</span>
                      <span className="block whitespace-nowrap">{customer.phone ?? "—"}</span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Last Order</dt>
                    <dd className="whitespace-nowrap text-ink">
                      {customer.lastOrderAt ? formatRelativeTime(customer.lastOrderAt) : "No orders yet"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
                    <dt className="text-muted-foreground">Total Spend</dt>
                    <dd className="text-xl font-semibold whitespace-nowrap text-ink">
                      {formatCompactCurrency(customer.lifetimeSpend)}
                    </dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/stock/orders/new?customer=${customer.id}`)}
                  className="mt-5 h-auto gap-2 rounded-md border-border bg-transparent py-2.5 text-xs font-bold tracking-wider text-ink uppercase transition-all hover:border-primary hover:bg-primary active:scale-95"
                >
                  <ShoppingCart className="size-4" strokeWidth={1.9} />
                  Create Order
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default StockCustomersPage;

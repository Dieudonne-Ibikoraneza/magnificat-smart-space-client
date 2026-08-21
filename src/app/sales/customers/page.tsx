"use client";

import { useMemo, useState } from "react";
import { Eye, ListFilter, Search, ShoppingCart, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { SalesPageHeader } from "@/app/sales/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { salesCustomers } from "@/data/sales-customers";

const CustomersPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredCustomers = salesCustomers.filter(
      (customer) =>
        (status === "all" || customer.status.toLowerCase() === status) &&
        (normalizedQuery === "" ||
          customer.name.toLowerCase().includes(normalizedQuery) ||
          customer.email.toLowerCase().includes(normalizedQuery)),
    );

    return sort === "name"
      ? [...filteredCustomers].sort((first, second) =>
          first.name.localeCompare(second.name),
        )
      : filteredCustomers;
  }, [query, sort, status]);

  return (
    <>
      <SalesPageHeader
        title="Customers"
        subtitle="Manage profiles, track history, and initiate orders."
        action={{ label: "Add Customer", icon: UserPlus }}
      />
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
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value ?? "all")}
                >
                  <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                    <SelectValue className="min-w-0 truncate">
                      {(value) =>
                        value === "active"
                          ? "Status: Active"
                          : value === "inactive"
                            ? "Status: Inactive"
                            : "Status: All"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status: All</SelectItem>
                    <SelectItem value="active">Status: Active</SelectItem>
                    <SelectItem value="inactive">Status: Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <span className="sr-only">Joined date</span>
                <Select
                  value={sort}
                  onValueChange={(value) => setSort(value ?? "newest")}
                >
                  <SelectTrigger className="h-10 w-full min-w-0 border-border bg-transparent text-sm font-medium">
                    <SelectValue className="min-w-0 truncate">
                      {(value) => value === "name" ? "Name: A - Z" : "Joined: Newest"}
                    </SelectValue>
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

        {results.length === 0 ? (
          <p className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
            No customers match your filters.
          </p>
        ) : (
          <ul className="grid gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {results.map((customer) => (
              <li
                key={customer.slug}
                className="group flex flex-col rounded-2xl bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 truncate text-xl font-bold text-ink">
                    {customer.name}
                  </h2>
                  <Badge
                    variant={
                      customer.status === "Active" ? "primary" : "warning"
                    }
                  >
                    {customer.status}
                  </Badge>
                </div>
                <dl className="mt-5 space-y-3 border-t border-[#E5E7EB] pt-4 font-data text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Contact</dt>
                    <dd className="min-w-0 text-right text-ink">
                      <span className="block truncate">{customer.email}</span>
                      <span className="block whitespace-nowrap">
                        {customer.phone}
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Last Order</dt>
                    <dd className="whitespace-nowrap text-ink">
                      {customer.lastOrder}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
                    <dt className="text-muted-foreground">Total Spend</dt>
                    <dd className="font-semibold whitespace-nowrap text-ink text-xl">
                      {customer.totalSpend}
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      router.push("/sales/customers/" + customer.slug)
                    }
                    className="h-auto rounded-md py-2.5 text-xs font-bold tracking-wider bg-transparent text-ink uppercase transition-all hover:bg-secondary active:scale-95"
                  >
                    <Eye className="size-4" strokeWidth={1.9} />
                    View
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto rounded-md border-border py-2.5 text-xs font-bold tracking-wider text-ink uppercase transition-all hover:border-primary bg-transparent hover:bg-primary active:scale-95"
                  >
                    <ShoppingCart className="size-4" strokeWidth={1.9} />
                    Order
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default CustomersPage;

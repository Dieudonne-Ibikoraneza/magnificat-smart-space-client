"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Wallet } from "lucide-react";
import { AnalyticsDetailHeader } from "@/app/analytics/layout";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/order-status-control";
import { Separator } from "@/components/ui/separator";
import { StaffCreatedIndicator } from "@/components/staff-created-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { hearAboutUsLabels } from "@/lib/api/mappers";
import type { UserStatus } from "@/lib/api/types";
import { formatCompactCurrency } from "@/lib/utils";

type CustomerDetailPageProps = { params: Promise<{ id: string }> };

const statusBadge: Record<UserStatus, "primary" | "muted" | "destructive"> = {
  ACTIVE: "primary",
  INACTIVE: "muted",
  SUSPENDED: "destructive",
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatRWF = (value: string | number) => `RWF ${Math.round(Number(value)).toLocaleString("en-US")}`;

const CustomerDetailPage = ({ params }: CustomerDetailPageProps) => {
  const { id } = use(params);
  const { data: customer, loading, error, reload } = useApi(() => usersApi.getCustomer(id), [id]);

  if (loading && !customer) return <ApiLoading label="Loading customer…" className="py-32" />;

  if (error) {
    if (error.toLowerCase().includes("not found")) notFound();
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }

  if (!customer) return null;

  const orders = customer.orders ?? [];

  return (
    <>
      <AnalyticsDetailHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/analytics/overview" },
          { label: "Customer Analytics", href: "/analytics/customers" },
          { label: customer.fullName },
        ]}
        title={customer.fullName}
        meta={
          <>
            <Badge variant={statusBadge[customer.status]}>{customer.status}</Badge>
            <span className="text-xs text-muted-foreground">Joined {formatDate(customer.createdAt)}</span>
          </>
        }
      />

      <div className="mt-1 space-y-5 sm:space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:max-w-3xl">
          {[
            { icon: Wallet, label: "Total Lifetime Spend", value: formatCompactCurrency(customer.lifetimeSpend) },
            {
              icon: CalendarDays,
              label: "Last Order Date",
              value: customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "No orders yet",
            },
          ].map(({ icon: Icon, label, value }) => (
            <article key={label} className="rounded-2xl bg-card p-5 shadow-sm transition-transform duration-200 active:scale-95 sm:p-6">
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                <Icon className="size-4 shrink-0" strokeWidth={1.9} />
                <span className="truncate">{label}</span>
              </div>
              <p className="mt-4 truncate font-data text-2xl font-bold text-ink sm:text-3xl">{value}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-5 sm:gap-6 xl:grid-cols-[1fr_1.7fr]">
          <section className="overflow-hidden rounded-2xl bg-card">
            <h2 className="px-5 py-5 text-lg font-bold text-ink sm:px-6">Profile Details</h2>
            <Separator className="bg-[#E5E7EB]" />
            <dl className="space-y-5 px-5 py-5 sm:px-6">
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Full Names</dt>
                <dd className="mt-1 text-sm text-ink">{customer.fullName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Contact Info</dt>
                <dd className="mt-1 text-sm">
                  {customer.email && (
                    <Link
                      href={"mailto:" + customer.email}
                      className="block truncate font-medium text-ink underline decoration-primary decoration-2 underline-offset-4 hover:opacity-70"
                    >
                      {customer.email}
                    </Link>
                  )}
                  {customer.phone && (
                    <Link href={"tel:" + customer.phone.replace(/\s/g, "")} className="mt-1 block text-ink hover:opacity-70">
                      {customer.phone}
                    </Link>
                  )}
                  {!customer.email && !customer.phone && <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Orders</dt>
                <dd className="mt-1 text-sm text-ink">{customer.orderCount} total</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Discovery Source</dt>
                <dd className="mt-1 text-sm text-ink">
                  {customer.heardAboutUs ? hearAboutUsLabels[customer.heardAboutUs] : "Not specified"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="overflow-hidden rounded-2xl bg-card">
            <h2 className="px-5 py-5 text-lg font-bold text-ink sm:px-6">Recent Orders</h2>
            {orders.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-muted-foreground sm:px-6">No orders yet.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {["Order ID", "Date", "Amount", "Status"].map((head) => (
                          <TableHead key={head}>{head}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-semibold text-ink">{order.orderNumber}</TableCell>
                          <TableCell className="whitespace-nowrap text-ink">{formatDate(order.createdAt)}</TableCell>
                          <TableCell className="font-semibold whitespace-nowrap text-ink">{formatRWF(order.total)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              {order.createdByType === "STAFF" && <StaffCreatedIndicator createdByName={order.createdBy?.fullName ?? "Staff"} />}
                              <OrderStatusBadge status={order.status} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="divide-y divide-[#E5E7EB] md:hidden">
                  {orders.map((order) => (
                    <li key={order.id} className="flex items-start justify-between gap-3 px-5 py-4 font-data">
                      <div>
                        <p className="text-sm font-semibold text-ink">{order.orderNumber}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-sm font-semibold text-ink">{formatRWF(order.total)}</p>
                        <div className="flex items-center gap-2">
                          {order.createdByType === "STAFF" && <StaffCreatedIndicator createdByName={order.createdBy?.fullName ?? "Staff"} />}
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default CustomerDetailPage;

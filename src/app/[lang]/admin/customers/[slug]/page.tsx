"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useTranslation } from "react-i18next";
import { CalendarDays, Plus, Wallet } from "lucide-react";
import { DashboardDetailHeader as AdminDetailHeader } from "@/components/dashboard-page-headers";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/list-pagination";
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
import type { UserStatus } from "@/lib/api/types";
import { formatCompactCurrency } from "@/lib/utils";

type CustomerDetailPageProps = { params: Promise<{ slug: string }> };

const statusBadge: Record<UserStatus, "primary" | "muted" | "destructive"> = {
  ACTIVE: "primary",
  INACTIVE: "muted",
  SUSPENDED: "destructive",
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const formatRWF = (value: string | number) => `RWF ${Math.round(Number(value)).toLocaleString("en-US")}`;

const ORDERS_PAGE_SIZE = 10;

/**
 * Real customer data (`GET /users/customers/:id`) — this used to render
 * `@/data/sales-customers` / `@/data/sales-orders` mock fixtures with no live
 * data behind it at all (see git history). Ported from the working
 * sales/customers/[slug] implementation, adapted for the admin route and
 * header.
 */
const CustomerDetailPage = ({ params }: CustomerDetailPageProps) => {
  const { t } = useTranslation();
  const { slug: id } = use(params);
  const [ordersPage, setOrdersPage] = useState(1);
  // `ordersPage` deliberately isn't in `deps` — see the same note in
  // sales/customers/[slug]: paging reloads the same query instead of
  // triggering a "genuinely different query" blank-out of the whole profile.
  const { data: customer, loading, error, reload } = useApi(
    () => usersApi.getCustomer(id, { page: ordersPage, limit: ORDERS_PAGE_SIZE }),
    [id],
  );

  if (loading && !customer) return <ApiLoading label={t("admin.customerDetail.loading")} className="py-32" />;

  if (error) {
    if (error.toLowerCase().includes("not found")) notFound();
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }

  if (!customer) return null;

  const orders = customer.orders ?? [];
  const ordersTotalPages = Math.max(1, Math.ceil(customer.ordersTotal / ORDERS_PAGE_SIZE));
  const goToOrdersPage = (next: number) => {
    setOrdersPage(next);
    reload();
  };

  return (
    <>
      <AdminDetailHeader
        breadcrumbs={[
          { label: t("admin.customerDetail.crumbOverview"), href: "/admin/overview" },
          { label: t("admin.customerDetail.crumbCustomers"), href: "/admin/customers" },
          { label: customer.fullName },
        ]}
        title={customer.fullName}
        actions={
          <Button
            nativeButton={false}
            render={<Link href={`/admin/orders/new?customer=${customer.id}`} />}
            className="h-auto rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 sm:px-5"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            {t("admin.customerDetail.newOrder")}
          </Button>
        }
        meta={
          <>
            <Badge variant={statusBadge[customer.status]}>{t(`staff.userStatus.${customer.status}`)}</Badge>
            <span className="text-xs text-muted-foreground">{t("admin.customerDetail.joined", { date: formatDate(customer.createdAt) })}</span>
          </>
        }
      />

      <div className="mt-1 space-y-5 sm:space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:max-w-3xl">
          {[
            { icon: Wallet, label: t("admin.customerDetail.totalLifetimeSpend"), value: formatCompactCurrency(customer.lifetimeSpend) },
            {
              icon: CalendarDays,
              label: t("admin.customerDetail.lastOrderDate"),
              value: customer.lastOrderAt ? formatDate(customer.lastOrderAt) : t("admin.customerDetail.noOrdersYet"),
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
            <h2 className="px-5 py-5 text-lg font-bold text-ink sm:px-6">{t("admin.customerDetail.profileDetails")}</h2>
            <Separator className="bg-[#E5E7EB]" />
            <dl className="space-y-5 px-5 py-5 sm:px-6">
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{t("admin.customerDetail.fullNames")}</dt>
                <dd className="mt-1 text-sm text-ink">{customer.fullName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{t("admin.customerDetail.contactInfo")}</dt>
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
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{t("admin.customerDetail.orders")}</dt>
                <dd className="mt-1 text-sm text-ink">{t("admin.customerDetail.ordersTotal", { count: customer.orderCount })}</dd>
              </div>
            </dl>
          </section>

          <section className="overflow-hidden rounded-2xl bg-card">
            <h2 className="px-5 py-5 text-lg font-bold text-ink sm:px-6">{t("admin.customerDetail.recentOrders")}</h2>
            {orders.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-muted-foreground sm:px-6">{t("admin.customerDetail.noOrders")}</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {[
                          t("admin.customerDetail.colOrderId"),
                          t("admin.customerDetail.colDate"),
                          t("admin.customerDetail.colAmount"),
                          t("admin.customerDetail.colStatus"),
                          t("admin.customerDetail.colAction"),
                        ].map((head) => (
                          <TableHead key={head}>{head}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-semibold text-ink">
                            <Link href={"/admin/orders/" + order.id} className="hover:underline">
                              {order.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-ink">{formatDate(order.createdAt)}</TableCell>
                          <TableCell className="font-semibold whitespace-nowrap text-ink">{formatRWF(order.total)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              {order.createdByType === "STAFF" && <StaffCreatedIndicator createdByName={order.createdBy?.fullName ?? t("admin.customerDetail.staffFallback")} />}
                              <OrderStatusBadge status={order.status} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={"/admin/orders/" + order.id}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold tracking-wider text-ink uppercase transition-all hover:bg-secondary active:scale-95"
                            >
                              {t("admin.customerDetail.view")}
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="divide-y divide-[#E5E7EB] md:hidden">
                  {orders.map((order) => (
                    <li key={order.id}>
                      <Link href={"/admin/orders/" + order.id} className="flex items-start justify-between gap-3 px-5 py-4 font-data transition-colors hover:bg-secondary/50">
                        <div>
                          <p className="text-sm font-semibold text-ink">{order.orderNumber}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-sm font-semibold text-ink">{formatRWF(order.total)}</p>
                          <div className="flex items-center gap-2">
                            {order.createdByType === "STAFF" && <StaffCreatedIndicator createdByName={order.createdBy?.fullName ?? t("admin.customerDetail.staffFallback")} />}
                            <OrderStatusBadge status={order.status} />
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {orders.length > 0 && (
              <ListPagination
                page={ordersPage}
                totalPages={ordersTotalPages}
                totalItems={customer.ordersTotal}
                pageSize={ORDERS_PAGE_SIZE}
                onPageChange={goToOrdersPage}
                className="px-5 pb-5 sm:px-6"
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default CustomerDetailPage;

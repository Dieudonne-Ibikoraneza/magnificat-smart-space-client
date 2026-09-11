"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronRight, Plus, Wallet } from "lucide-react";
import { AdminDetailHeader } from "@/app/admin/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { SalesCustomer } from "@/data/sales-customers";
import type { SalesOrder } from "@/data/sales-orders";

const orderStatusVariants = {
  Processing: "secondary",
  Shipped: "primary",
  Delivered: "muted",
} as const;

const getOrderStatusVariant = (status: keyof typeof orderStatusVariants) =>
  orderStatusVariants[status];

const CustomerDetailView = ({
  customer,
  recentOrders,
}: {
  customer: SalesCustomer;
  recentOrders: SalesOrder[];
}) => {
  const { t } = useTranslation();

  return (
    <>
      <AdminDetailHeader
        breadcrumbs={[
          { label: t("admin.customerDetail.crumbOverview"), href: "/admin/overview" },
          { label: t("admin.customerDetail.crumbCustomers"), href: "/admin/customers" },
          { label: customer.name },
        ]}
        title={customer.name}
        actions={
          <Button
            nativeButton={false}
            render={<Link href={`/admin/orders/new?customer=${customer.slug}`} />}
            className="h-auto rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 sm:px-5"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            {t("admin.customerDetail.newOrder")}
          </Button>
        }
        meta={
          <>
            <Badge
              variant={customer.status === "Active" ? "primary" : "warning"}
            >
              {customer.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t("admin.customerDetail.customerIdJoined", { id: customer.customerId, date: customer.joined })}
            </span>
          </>
        }
      />

      <div className="space-y-5 sm:space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:max-w-3xl">
          {[
            {
              key: "lifetimeSpend",
              icon: Wallet,
              label: t("admin.customerDetail.totalLifetimeSpend"),
              value: customer.lifetimeSpend,
            },
            {
              key: "lastOrderDate",
              icon: CalendarDays,
              label: t("admin.customerDetail.lastOrderDate"),
              value: customer.lastOrder,
            },
          ].map(({ key, icon: Icon, label, value }) => (
            <article
              key={key}
              className="rounded-2xl bg-card p-5 shadow-sm transition-transform duration-200 active:scale-95 sm:p-6"
            >
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                <Icon className="size-4 shrink-0" strokeWidth={1.9} />
                <span className="truncate">{label}</span>
              </div>
              <p className="mt-4 truncate font-data text-2xl font-bold text-ink sm:text-3xl">
                {value}
              </p>
            </article>
          ))}
        </div>

        <div className="grid gap-5 sm:gap-6 xl:grid-cols-[1fr_1.7fr]">
          <section className="overflow-hidden rounded-2xl bg-card">
            <h2 className="px-5 py-5 text-lg font-bold text-ink sm:px-6">
              {t("admin.customerDetail.profileDetails")}
            </h2>
            <Separator className="bg-[#E5E7EB]" />
            <dl className="space-y-5 px-5 py-5 sm:px-6">
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  {t("admin.customerDetail.fullNames")}
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {customer.contactName}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  {t("admin.customerDetail.contactInfo")}
                </dt>
                <dd className="mt-1 text-sm">
                  <Link
                    href={"mailto:" + customer.email}
                    className="block truncate font-medium text-ink underline decoration-primary decoration-2 underline-offset-4 hover:opacity-70"
                  >
                    {customer.email}
                  </Link>
                  <Link
                    href={"tel:" + customer.phone.replace(/\s/g, "")}
                    className="mt-1 block text-ink hover:opacity-70"
                  >
                    {customer.phone}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  {t("admin.customerDetail.address")}
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {customer.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </section>

          <section className="overflow-hidden rounded-2xl bg-card">
            <h2 className="px-5 py-5 text-lg font-bold text-ink sm:px-6">
              {t("admin.customerDetail.recentOrders")}
            </h2>
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
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-semibold text-ink">
                        <Link
                          href={"/admin/orders/" + order.id}
                          className="hover:underline"
                        >
                          {order.id}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-ink">
                        {order.date}
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap text-ink">
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
                      <TableCell>
                        <Link
                          href={"/admin/orders/" + order.id}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold tracking-wider text-ink uppercase transition-all hover:bg-secondary active:scale-95"
                        >
                          {t("admin.customerDetail.view")} <ChevronRight className="size-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y divide-[#E5E7EB] md:hidden">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={"/admin/orders/" + order.id}
                    className="flex items-start justify-between gap-3 px-5 py-4 font-data transition-colors hover:bg-secondary/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {order.id}
                      </p>
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
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
};

export default CustomerDetailView;

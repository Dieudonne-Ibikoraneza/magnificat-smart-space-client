import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
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
import { getSalesCustomer } from "@/data/sales-customers";
import { getSalesOrdersForCustomer } from "@/data/sales-orders";

type CustomerDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const orderStatusVariants = {
  Processing: "secondary",
  Shipped: "primary",
  Delivered: "muted",
} as const;

const getOrderStatusVariant = (status: keyof typeof orderStatusVariants) =>
  orderStatusVariants[status];

export const generateMetadata = async ({
  params,
}: CustomerDetailPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const customer = getSalesCustomer(slug);

  return {
    title: customer
      ? customer.name + " | Customers | Magnificat Smart Space"
      : "Customer | Magnificat Smart Space",
    description: customer
      ? "Profile details, lifetime spend and recent orders for " +
        customer.name +
        "."
      : "Customer details.",
  };
};

const CustomerDetailPage = async ({ params }: CustomerDetailPageProps) => {
  const { slug } = await params;
  const customer = getSalesCustomer(slug);

  if (!customer) notFound();

  const recentOrders = getSalesOrdersForCustomer(customer.slug);

  return (
    <>
      <AdminDetailHeader
        breadcrumbs={[
          { label: "Overview", href: "/admin/overview" },
          { label: "Customers", href: "/admin/customers" },
          { label: customer.name },
        ]}
        title={customer.name}
        actions={
          <Button
            type="button"
            className="h-auto rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 sm:px-5"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            New Order
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
              Customer ID: {customer.customerId} • Joined {customer.joined}
            </span>
          </>
        }
      />

      <div className="space-y-5 sm:space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:max-w-3xl">
          {[
            {
              icon: Wallet,
              label: "Total Lifetime Spend",
              value: customer.lifetimeSpend,
            },
            {
              icon: CalendarDays,
              label: "Last Order Date",
              value: customer.lastOrder,
            },
          ].map(({ icon: Icon, label, value }) => (
            <article
              key={label}
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
              Profile Details
            </h2>
            <Separator className="bg-[#E5E7EB]" />
            <dl className="space-y-5 px-5 py-5 sm:px-6">
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  Full Names
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {customer.contactName}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  Contact Info
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
                  Address
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
              Recent Orders
            </h2>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Order ID", "Date", "Amount", "Status", "Action"].map(
                      (head) => (
                        <TableHead key={head}>{head}</TableHead>
                      ),
                    )}
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
                          View <ChevronRight className="size-4" />
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

export default CustomerDetailPage;

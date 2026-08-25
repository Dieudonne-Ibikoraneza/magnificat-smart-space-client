import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Boxes,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock,
  Contact,
  History,
  Mail,
  MapPin,
  Phone,
  Printer,
  Wallet,
} from "lucide-react";
import { SalesDetailHeader } from "@/app/sales/layout";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { getSalesOrder, sumSalesOrderItems } from "@/data/sales-orders";

type OrderDetailPageProps = { params: Promise<{ id: string }> };
type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const orderVariant = (
  status: "Processing" | "Shipped" | "Delivered",
): BadgeVariant =>
  ({
    Processing: "secondary",
    Shipped: "primary",
    Delivered: "muted",
  } as const)[status];

export const generateMetadata = async ({
  params,
}: OrderDetailPageProps): Promise<Metadata> => {
  const { id } = await params;
  const order = getSalesOrder(id);
  return {
    title: order
      ? "Order " + order.id + " | Magnificat Smart Space"
      : "Order | Magnificat Smart Space",
    description: order
      ? "Line items, customer details and delivery timeline for order " + order.id + "."
      : "Order details",
  };
};

const OrderDetailPage = async ({ params }: OrderDetailPageProps) => {
  const { id } = await params;
  const order = getSalesOrder(id);
  if (!order) notFound();

  const customer = getSalesCustomer(order.customerSlug);
  const summary = [
    {
      icon: Wallet,
      label: "Total Amount",
      value: order.amountShort,
      note: "Full amount: " + order.amount,
    },
    {
      icon: CalendarDays,
      label: "Order Date",
      value: order.date,
      note:
        order.expectedDelivery === "Delivered"
          ? ""
          : "Expected delivery in " + order.expectedDelivery,
    },
    {
      icon: Building2,
      label: "Customer",
      value: order.customerName,
      note: "",
    },
    {
      icon: Boxes,
      label: "Total Items",
      value: order.items.length + " Types",
      note: order.totalVolume,
    },
  ];

  return (
    <>
      <SalesDetailHeader
        breadcrumbs={[
          { label: "Overview", href: "/sales/overview" },
          { label: "Orders", href: "/sales/orders" },
          { label: order.id },
        ]}
        title={`Order #${order.id}`}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-auto gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase transition-transform duration-200 active:scale-95"
            >
              <Printer className="size-4" />
              Print Invoice
            </Button>
            <Button
              type="button"
              className="h-auto gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase transition-transform duration-200 active:scale-95"
            >
              Update Status
            </Button>
          </>
        }
        meta={
          <>
            {order.createdByType === "staff" && (
              <StaffCreatedIndicator createdByName={order.createdByName} />
            )}
            <Badge variant={orderVariant(order.status)}>{order.status}</Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-4" />
              Last updated {order.updatedAgo}
            </span>
          </>
        }
      />

      <div className="pace-y-5 sm:space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {summary.map(({ icon: Icon, label, value, note }) => (
            <article
              key={label}
              className="rounded-2xl bg-card p-5 transition-transform duration-200 active:scale-95 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  {label}
                </span>
                <Icon className="size-5 shrink-0 text-muted-foreground" />
              </div>
              <p className="mt-3 truncate font-data text-xl font-bold text-ink sm:text-2xl">
                {value}
              </p>
              {label === "Customer" ? (
                <Link
                  href={"/sales/customers/" + order.customerSlug}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-ink transition-transform duration-200 hover:translate-x-1"
                >
                  View profile <ChevronRight className="size-3.5" />
                </Link>
              ) : note ? (
                <p className="mt-1 text-xs text-muted-foreground">{note}</p>
              ) : null}
            </article>
          ))}
        </div>

        <div className="mt-4 grid items-start gap-5 sm:gap-6 xl:grid-cols-[1.7fr_1fr]">
          <section className="overflow-hidden rounded-2xl bg-card">
            <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
              <h2 className="text-lg font-bold text-ink sm:text-2xl">Order Items</h2>
              <Badge variant="secondary">{order.items.length} Items</Badge>
            </div>

            <div className="md:hidden">
              <ul className="divide-y divide-[#E8E8E8]">
                {order.items.map((item) => (
                  <li key={item.product} className="px-5 py-4 font-data">
                    <Link href={"/products/" + item.productId} className="flex items-center gap-3 font-semibold text-ink uppercase hover:underline">
                      <Image src={item.image} alt="" width={48} height={48} unoptimized className="size-12 shrink-0 rounded-sm object-cover" />
                      <span>{item.product}</span>
                    </Link>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity} • {item.boxes} boxes{item.additionalPieces > 0 ? " + " + item.additionalPieces + " pcs" : ""} ({item.pieces} pcs) • {item.unitPrice}
                      </span>
                      <span className="font-semibold text-ink">{item.total}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.product}>
                      <TableCell className="font-medium text-ink uppercase">
                        <Link href={"/products/" + item.productId} className="flex items-center gap-3 hover:underline">
                          <Image src={item.image} alt="" width={64} height={64} unoptimized className="size-16 shrink-0 rounded-sm object-cover" />
                          <span>{item.product}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-ink">
                        <span className="block">{item.quantity}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.boxes} boxes{item.additionalPieces > 0 ? " + " + item.additionalPieces + " pcs" : ""} ({item.pieces} pcs)
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{item.unitPrice}</TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-ink">{item.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 bg-primary px-5 py-6 sm:justify-end sm:px-10">
              <span className="font-data text-lg font-semibold text-primary-foreground sm:text-2xl">Total</span>
              <span className="font-data text-xl font-bold text-primary-foreground sm:text-3xl">
                {sumSalesOrderItems(order.items)}
              </span>
            </div>
          </section>

          <div className="space-y-5 sm:space-y-6">
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-ink">
                  <Contact className="size-5" />
                </span>
                <h2 className="text-lg font-bold text-ink sm:text-xl">Customer Info</h2>
              </div>
              {customer ? (
                <dl className="mt-5 space-y-5 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Company</dt>
                    <dd className="mt-1">
                      <Link href={"/sales/customers/" + customer.slug} className="font-medium text-ink underline decoration-primary decoration-2 underline-offset-4 hover:opacity-70">
                        {customer.name}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Contact Person</dt>
                    <dd className="mt-2 flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
                        {customer.contactName.split(" ").map((part) => part[0]).join("")}
                      </span>
                      <span className="text-ink">{customer.contactName}</span>
                    </dd>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Email</dt>
                      <dd className="truncate">
                        <Link href={"mailto:" + customer.email} className="text-ink hover:opacity-70">{customer.email}</Link>
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Phone</dt>
                      <dd className="text-ink">{customer.phone}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Delivery Address</dt>
                      <dd className="text-ink">{customer.address.map((line) => <span key={line} className="block">{line}</span>)}</dd>
                    </div>
                  </div>
                </dl>
              ) : null}
            </section>

            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-ink"><History className="size-5" /></span>
                <h2 className="text-lg font-bold text-ink sm:text-xl">Timeline</h2>
              </div>
              <ol className="mt-5 space-y-6 border-l border-border pl-6">
                {order.timeline.map((step) => (
                  <li key={step.label} className="relative">
                    <span className={"absolute top-1.5 -left-[31px] size-3 rounded-full border-2 " + (step.state === "pending" ? "border-border bg-card" : step.state === "current" ? "border-ink bg-primary" : "border-ink bg-ink")} />
                    <div className={step.state === "current" ? "rounded-lg bg-primary p-3" : ""}>
                      <p className={"text-[11px] font-bold tracking-wider uppercase " + (step.state === "pending" ? "text-muted-foreground" : "text-ink")}>{step.label}</p>
                      {step.timestamp ? <p className="mt-0.5 font-data text-xs text-muted-foreground">{step.timestamp}</p> : null}
                      {step.note ? <p className={"mt-1 text-xs " + (step.state === "pending" ? "text-muted-foreground" : "text-ink")}>{step.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderDetailPage;

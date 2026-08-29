"use client";

import { use } from "react";
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
import { StockDetailHeader } from "@/app/stock/layout";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderNegotiationPanel } from "@/components/order-negotiation-panel";
import { OrderQuotationPanel } from "@/components/order-quotation-panel";
import { OrderStatusControl } from "@/components/order-status-control";
import { StaffCreatedIndicator } from "@/components/staff-created-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ordersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { OrderStatus } from "@/lib/api/types";

type OrderDetailPageProps = { params: Promise<{ id: string }> };

const ACTIVE_STEPS: OrderStatus[] = ["PENDING", "PROCESSING", "READY_FOR_DISPATCH", "SHIPPED", "DELIVERED"];

const stepLabels: Record<OrderStatus, string> = {
  PENDING: "Order Placed",
  PROCESSING: "Processing",
  READY_FOR_DISPATCH: "Ready for Dispatch",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const formatPrice = (value: string | number) => `RWF ${Math.round(Number(value)).toLocaleString("en-US")}`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const timeAgo = (iso: string) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const OrderDetailPage = ({ params }: OrderDetailPageProps) => {
  const { id } = use(params);
  const { data: order, loading, error, reload } = useApi(() => ordersApi.get(id), [id]);

  if (loading) return <ApiLoading label="Loading order…" className="py-32" />;

  if (error) {
    if (error.toLowerCase().includes("not found") || error.toLowerCase().includes("access")) {
      return (
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-xl font-bold text-ink">Order not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This order doesn&apos;t exist.</p>
          <Button nativeButton={false} render={<Link href="/stock/orders" />} className="mt-6 h-11 gap-2 px-5">
            Back to Orders
          </Button>
        </div>
      );
    }
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }

  if (!order) return null;

  const items = order.items ?? [];
  const totalVolumeSqm = items.reduce((sum, item) => sum + Number(item.requiredAreaSqm), 0);

  const summary = [
    { icon: Wallet, label: "Total Amount", value: formatPrice(order.total), note: null as string | null },
    {
      icon: CalendarDays,
      label: "Order Date",
      value: formatDateTime(order.createdAt).split(",")[0],
      note: order.expectedDeliveryAt
        ? `Expected ${new Date(order.expectedDeliveryAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`
        : null,
    },
    { icon: Building2, label: "Customer", value: order.customer?.fullName ?? "Unknown", note: null },
    {
      icon: Boxes,
      label: "Total Items",
      value: `${items.length} ${items.length === 1 ? "Type" : "Types"}`,
      note: `${totalVolumeSqm.toLocaleString()} m² total`,
    },
  ];

  return (
    <>
      <StockDetailHeader
        breadcrumbs={[
          { label: "Overview", href: "/stock/overview" },
          { label: "Orders", href: "/stock/orders" },
          { label: order.orderNumber },
        ]}
        title={`Order #${order.orderNumber}`}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="h-auto gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase transition-transform duration-200 active:scale-95"
          >
            <Printer className="size-4" />
            Print Invoice
          </Button>
        }
        meta={
          <>
            {order.createdByType === "STAFF" && (
              <StaffCreatedIndicator createdByName={order.createdBy?.fullName ?? ""} />
            )}
            <OrderStatusControl orderId={order.id} status={order.status} onUpdated={reload} />
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-4" />
              Last updated {timeAgo(order.updatedAt)}
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
              {label === "Customer" && order.customerId ? (
                <Link
                  href={"/sales/customers/" + order.customerId}
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
              <Badge variant="secondary">{items.length} Items</Badge>
            </div>

            <div className="md:hidden">
              <ul className="divide-y divide-[#E8E8E8]">
                {items.map((item) => (
                  <li key={item.id} className="px-5 py-4 font-data">
                    <Link href={"/products/" + item.productId} className="flex items-center gap-3 font-semibold text-ink uppercase hover:underline">
                      {item.product?.image && (
                        <Image src={item.product.image} alt="" width={48} height={48} unoptimized className="size-12 shrink-0 rounded-sm object-cover" />
                      )}
                      <span>{item.product?.name ?? "Item"}</span>
                    </Link>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {Number(item.requiredAreaSqm)} m² • {item.boxes} boxes{item.additionalPieces > 0 ? ` + ${item.additionalPieces} pcs` : ""} ({item.totalPieces} pcs) • {formatPrice(item.unitPrice)}
                      </span>
                      <span className="font-semibold text-ink">{formatPrice(item.totalPrice)}</span>
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
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-ink uppercase">
                        <Link href={"/products/" + item.productId} className="flex items-center gap-3 hover:underline">
                          {item.product?.image && (
                            <Image src={item.product.image} alt="" width={64} height={64} unoptimized className="size-16 shrink-0 rounded-sm object-cover" />
                          )}
                          <span>{item.product?.name ?? "Item"}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-ink">
                        <span className="block">{Number(item.requiredAreaSqm)} m²</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.boxes} boxes{item.additionalPieces > 0 ? ` + ${item.additionalPieces} pcs` : ""} ({item.totalPieces} pcs)
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatPrice(item.unitPrice)} / m²</TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-ink">{formatPrice(item.totalPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 bg-primary px-5 py-6 sm:justify-end sm:px-10">
              <span className="font-data text-lg font-semibold text-primary-foreground sm:text-2xl">Total</span>
              <span className="font-data text-xl font-bold text-primary-foreground sm:text-3xl">
                {formatPrice(order.total)}
              </span>
            </div>
          </section>

          <div className="space-y-5 sm:space-y-6">
            <OrderQuotationPanel
              orderId={order.id}
              subtotalValue={Number(order.subtotal)}
              deliveryDetails={order.delivery}
              quotationStatus={order.quotationStatus}
              transportFee={order.transportFee ? Number(order.transportFee) : null}
              transportFeeNote={order.transportFeeNote}
              canManage={true}
              onUpdated={reload}
            />

            <OrderNegotiationPanel orderId={order.id} />

            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-ink">
                  <Contact className="size-5" />
                </span>
                <h2 className="text-lg font-bold text-ink sm:text-xl">Customer Info</h2>
              </div>
              {order.customer ? (
                <dl className="mt-5 space-y-5 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Customer</dt>
                    <dd className="mt-2 flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
                        {order.customer.fullName.split(" ").map((part) => part[0]).join("")}
                      </span>
                      <Link href={"/sales/customers/" + order.customer.id} className="font-medium text-ink underline decoration-primary decoration-2 underline-offset-4 hover:opacity-70">
                        {order.customer.fullName}
                      </Link>
                    </dd>
                  </div>
                  {order.customer.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Email</dt>
                        <dd className="truncate">
                          <Link href={"mailto:" + order.customer.email} className="text-ink hover:opacity-70">{order.customer.email}</Link>
                        </dd>
                      </div>
                    </div>
                  )}
                  {order.customer.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Phone</dt>
                        <dd className="text-ink">{order.customer.phone}</dd>
                      </div>
                    </div>
                  )}
                  {order.delivery && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Delivery Address</dt>
                        <dd className="text-ink">{order.delivery.address}, {order.delivery.city}</dd>
                      </div>
                    </div>
                  )}
                </dl>
              ) : null}
            </section>

            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-ink"><History className="size-5" /></span>
                <h2 className="text-lg font-bold text-ink sm:text-xl">Timeline</h2>
              </div>
              {order.status === "CANCELLED" ? (
                <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">This order was cancelled.</p>
              ) : (
                <ol className="mt-5 space-y-6 border-l border-border pl-6">
                  {ACTIVE_STEPS.map((step, index) => {
                    const currentStepIndex = ACTIVE_STEPS.indexOf(order.status);
                    const timestamp = order.statusEvents?.find((event) => event.status === step)?.createdAt;
                    const state = index < currentStepIndex ? "done" : index === currentStepIndex ? "current" : "pending";
                    return (
                      <li key={step} className="relative">
                        <span className={"absolute top-1.5 -left-[31px] size-3 rounded-full border-2 " + (state === "pending" ? "border-border bg-card" : state === "current" ? "border-ink bg-primary" : "border-ink bg-ink")} />
                        <div className={state === "current" ? "rounded-lg bg-primary p-3" : ""}>
                          <p className={"text-[11px] font-bold tracking-wider uppercase " + (state === "pending" ? "text-muted-foreground" : "text-ink")}>{stepLabels[step]}</p>
                          {timestamp ? <p className="mt-0.5 font-data text-xs text-muted-foreground">{formatDateTime(timestamp)}</p> : null}
                          <p className={"mt-1 text-xs " + (state === "pending" ? "text-muted-foreground" : "text-ink")}>
                            {state === "pending" ? "Pending" : timestamp ? "Done" : "In progress"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderDetailPage;

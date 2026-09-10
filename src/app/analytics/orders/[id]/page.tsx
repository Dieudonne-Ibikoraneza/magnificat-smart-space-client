"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
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
  Wallet,
} from "lucide-react";
import { AnalyticsDetailHeader } from "@/app/analytics/layout";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderQuotationPanel } from "@/components/order-quotation-panel";
import { OrderStatusBadge } from "@/components/order-status-control";
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

const formatPrice = (value: string | number) => `RWF ${Math.round(Number(value)).toLocaleString("en-US")}`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

type TFn = (key: string, opts?: Record<string, unknown>) => string;

const timeAgo = (iso: string, t: TFn) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t("sales.orderDetail.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("sales.orderDetail.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("sales.orderDetail.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("sales.orderDetail.daysAgo", { count: days });
};

/** Analyst view — read-only: no status changes, no quotation actions, no delivery editing. */
const OrderDetailPage = ({ params }: OrderDetailPageProps) => {
  const { t } = useTranslation();
  const { id } = use(params);
  const { data: order, loading, error, reload } = useApi(() => ordersApi.get(id), [id]);

  // Only the very first load has nothing to show yet — a background refetch
  // keeps the order on screen and updates it in place once fresh data lands.
  if (loading && !order) return <ApiLoading label={t("sales.orderDetail.loading")} className="py-32" />;

  if (error) {
    if (error.toLowerCase().includes("not found") || error.toLowerCase().includes("access")) {
      return (
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-xl font-bold text-ink">{t("analytics.orderDetail.notFoundTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("analytics.orderDetail.notFoundBody")}</p>
          <Button nativeButton={false} render={<Link href="/analytics/sales" />} className="mt-6 h-11 gap-2 px-5">
            {t("analytics.orderDetail.back")}
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
    { key: "total", icon: Wallet, label: t("sales.orderDetail.totalAmount"), value: formatPrice(order.total), note: null as string | null },
    {
      key: "date",
      icon: CalendarDays,
      label: t("sales.orderDetail.orderDate"),
      value: formatDateTime(order.createdAt).split(",")[0],
      note: order.expectedDeliveryAt
        ? t("sales.orderDetail.expected", {
            date: new Date(order.expectedDeliveryAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
          })
        : null,
    },
    { key: "customer", icon: Building2, label: t("sales.orderDetail.customer"), value: order.customer?.fullName ?? t("sales.orderDetail.unknown"), note: null },
    {
      key: "items",
      icon: Boxes,
      label: t("sales.orderDetail.totalItems"),
      value: t("sales.orderDetail.type", { count: items.length }),
      note: t("sales.orderDetail.volumeTotal", { value: totalVolumeSqm.toLocaleString() }),
    },
  ];

  return (
    <>
      <AnalyticsDetailHeader
        breadcrumbs={[
          { label: t("analytics.orderDetail.crumbDashboard"), href: "/analytics/overview" },
          { label: t("analytics.orderDetail.crumbSales"), href: "/analytics/sales" },
          { label: order.orderNumber },
        ]}
        title={t("sales.orderDetail.heading", { number: order.orderNumber })}
        meta={
          <>
            {order.createdByType === "STAFF" && (
              <StaffCreatedIndicator createdByName={order.createdBy?.fullName ?? ""} />
            )}
            <OrderStatusBadge status={order.status} />
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-4" />
              {t("sales.orderDetail.lastUpdated", { time: timeAgo(order.updatedAt, t) })}
            </span>
          </>
        }
      />

      <div className="pace-y-5 sm:space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {summary.map(({ key, icon: Icon, label, value, note }) => (
            <article
              key={key}
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
              {key === "customer" && order.customerId ? (
                <Link
                  href={"/analytics/customers/" + order.customerId}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-ink transition-transform duration-200 hover:translate-x-1"
                >
                  {t("sales.orderDetail.viewProfile")} <ChevronRight className="size-3.5" />
                </Link>
              ) : note ? (
                <p className="mt-1 text-xs text-muted-foreground">{note}</p>
              ) : null}
            </article>
          ))}
        </div>

        <div className="mt-4 grid items-start gap-5 sm:gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="space-y-5 sm:space-y-6">
            <section className="overflow-hidden rounded-2xl bg-card">
              <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-bold text-ink sm:text-2xl">{t("sales.orderDetail.orderItems")}</h2>
                <Badge variant="secondary">{t("sales.orderDetail.itemsCount", { count: items.length })}</Badge>
              </div>

              <div className="md:hidden">
                <ul className="divide-y divide-[#E8E8E8]">
                  {items.map((item) => (
                    <li key={item.id} className="px-5 py-4 font-data">
                      <Link href={"/products/" + item.productId} className="flex items-center gap-3 font-semibold text-ink uppercase hover:underline">
                        {item.product?.image && (
                          <Image src={item.product.image} alt="" width={48} height={48} unoptimized className="size-12 shrink-0 rounded-sm object-cover" />
                        )}
                        <span>{item.product?.name ?? t("sales.orderDetail.itemFallback")}</span>
                      </Link>
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">
                          {Number(item.requiredAreaSqm)} m² • {t("sales.orderDetail.quantityLine", {
                            boxes: item.boxes,
                            extra: item.additionalPieces > 0 ? t("sales.orderDetail.quantityExtra", { count: item.additionalPieces }) : "",
                            pieces: item.totalPieces,
                          })} • {formatPrice(item.unitPrice)}
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
                      <TableHead>{t("sales.orderDetail.colProduct")}</TableHead>
                      <TableHead>{t("sales.orderDetail.colQuantity")}</TableHead>
                      <TableHead>{t("sales.orderDetail.colUnitPrice")}</TableHead>
                      <TableHead>{t("sales.orderDetail.colTotal")}</TableHead>
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
                            <span>{item.product?.name ?? t("sales.orderDetail.itemFallback")}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-ink">
                          <span className="block">{Number(item.requiredAreaSqm)} m²</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {t("sales.orderDetail.quantityLine", {
                              boxes: item.boxes,
                              extra: item.additionalPieces > 0 ? t("sales.orderDetail.quantityExtra", { count: item.additionalPieces }) : "",
                              pieces: item.totalPieces,
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{t("sales.orderDetail.perSqm", { price: formatPrice(item.unitPrice) })}</TableCell>
                        <TableCell className="whitespace-nowrap font-semibold text-ink">{formatPrice(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 bg-primary px-5 py-6 sm:justify-end sm:px-10">
                <span className="font-data text-lg font-semibold text-primary-foreground sm:text-2xl">{t("sales.orderDetail.total")}</span>
                <span className="font-data text-xl font-bold text-primary-foreground sm:text-3xl">
                  {formatPrice(order.total)}
                </span>
              </div>
            </section>

            <OrderQuotationPanel
              orderId={order.id}
              subtotalValue={Number(order.subtotal)}
              deliveryDetails={order.delivery}
              customerName={order.customer?.fullName}
              customerPhone={order.customer?.phone}
              quotationStatus={order.quotationStatus}
              orderCancelled={order.status === "CANCELLED"}
              transportFee={order.transportFee ? Number(order.transportFee) : null}
              transportFeeNote={order.transportFeeNote}
              canManage={false}
              canEditDelivery={false}
              onUpdated={reload}
            />
          </div>

          <div className="space-y-5 sm:space-y-6">
            <section className="rounded-2xl bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-ink">
                  <Contact className="size-5" />
                </span>
                <h2 className="text-lg font-bold text-ink sm:text-xl">{t("sales.orderDetail.customerInfo")}</h2>
              </div>
              {order.customer ? (
                <dl className="mt-5 space-y-5 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{t("sales.orderDetail.customer")}</dt>
                    <dd className="mt-2 flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
                        {order.customer.fullName.split(" ").map((part) => part[0]).join("")}
                      </span>
                      <Link href={"/analytics/customers/" + order.customer.id} className="font-medium text-ink underline decoration-primary decoration-2 underline-offset-4 hover:opacity-70">
                        {order.customer.fullName}
                      </Link>
                    </dd>
                  </div>
                  {order.customer.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{t("sales.orderDetail.email")}</dt>
                        <dd className="truncate text-ink">{order.customer.email}</dd>
                      </div>
                    </div>
                  )}
                  {order.customer.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{t("sales.orderDetail.phone")}</dt>
                        <dd className="text-ink">{order.customer.phone}</dd>
                      </div>
                    </div>
                  )}
                  {order.delivery && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{t("sales.orderDetail.deliveryAddress")}</dt>
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
                <h2 className="text-lg font-bold text-ink sm:text-xl">{t("sales.orderDetail.timeline")}</h2>
              </div>
              {order.status === "CANCELLED" ? (
                <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{t("sales.orderDetail.cancelled")}</p>
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
                          <p className={"text-[11px] font-bold tracking-wider uppercase " + (state === "pending" ? "text-muted-foreground" : "text-ink")}>{t(`staff.orderStep.${step}`)}</p>
                          {timestamp ? <p className="mt-0.5 font-data text-xs text-muted-foreground">{formatDateTime(timestamp)}</p> : null}
                          <p className={"mt-1 text-xs " + (state === "pending" ? "text-muted-foreground" : "text-ink")}>
                            {state === "done"
                              ? t("sales.orderDetail.stepDone")
                              : state === "current"
                                ? timestamp
                                  ? t("sales.orderDetail.stepDone")
                                  : t("sales.orderDetail.stepInProgress")
                                : t("sales.orderDetail.stepPending")}
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

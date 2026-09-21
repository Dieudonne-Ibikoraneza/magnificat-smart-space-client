"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { billedAreaOf } from "@/lib/order-area";
import { RequestedAreaNote } from "@/components/requested-area-note";
import {
  Boxes,
  CalendarDays,
  Check,
  Clock,
  Headset,
  History,
  Printer,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiErrorState, ApiLoading } from "@/components/api-state";
import { CustomerQuotationCard } from "@/components/customer-quotation-card";
import { DeliveryDetailsCard } from "@/components/delivery-details-card";
import { OrderNegotiationPanel } from "@/components/order-negotiation-panel";
import { OrderSupportDialog } from "@/components/order-support-dialog";
import { ordersApi } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import type { OrderStatus } from "@/lib/api/types";

type AccountOrderDetailsProps = { params: Promise<{ id: string }> };

const ACTIVE_STEPS: OrderStatus[] = ["PENDING", "PROCESSING", "READY_FOR_DISPATCH", "SHIPPED", "DELIVERED"];

const STEP_KEYS = {
  WAITLISTED: "dash.orderDetail.step.WAITLISTED",
  PENDING: "dash.orderDetail.step.PENDING",
  PROCESSING: "dash.orderDetail.step.PROCESSING",
  READY_FOR_DISPATCH: "dash.orderDetail.step.READY_FOR_DISPATCH",
  SHIPPED: "dash.orderDetail.step.SHIPPED",
  DELIVERED: "dash.orderDetail.step.DELIVERED",
  CANCELLED: "dash.orderDetail.step.CANCELLED",
} as const;

const statusVariant: Record<OrderStatus, "outline" | "secondary" | "warning" | "primary" | "muted" | "destructive"> = {
  WAITLISTED: "warning",
  PENDING: "outline",
  PROCESSING: "secondary",
  READY_FOR_DISPATCH: "warning",
  SHIPPED: "primary",
  DELIVERED: "muted",
  CANCELLED: "destructive",
};

const formatPrice = (value: string | number) => `RWF ${Math.round(Number(value)).toLocaleString("en-US")}`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const AccountOrderDetailsPage = ({ params }: AccountOrderDetailsProps) => {
  const { t } = useTranslation();
  const { id } = use(params);
  const { data: order, loading, error, reload } = useApi(() => ordersApi.get(id), [id]);

  // Only the very first load has nothing to show yet — a background refetch
  // (after saving delivery details, marking payment done, etc.) keeps the
  // order on screen and updates it in place once the fresh data lands,
  // instead of blanking the whole page back to a spinner.
  if (loading && !order) return <ApiLoading label={t("dash.orderDetail.loading")} className="py-32" />;

  if (error) {
    if (error.toLowerCase().includes("not found") || error.toLowerCase().includes("access")) {
      return (
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-xl font-bold text-ink">{t("dash.orderDetail.notFoundTitle")}</h1>
          <p className="mt-2 text-sm text-muted">
            {t("dash.orderDetail.notFoundBody")}
          </p>
          <Button nativeButton={false} render={<Link href="/account/orders" />} className="mt-6 h-11 gap-2 px-5">
            {t("dash.orderDetail.backToOrders")}
          </Button>
        </div>
      );
    }
    return <ApiErrorState message={error} onRetry={reload} className="my-16" />;
  }

  if (!order) return null;

  const items = order.items ?? [];
  const totalVolumeSqm = items.reduce((sum, item) => sum + billedAreaOf(item), 0);
  const isCancelled = order.status === "CANCELLED";
  const currentStepIndex = ACTIVE_STEPS.indexOf(order.status);

  const eventAt = (status: OrderStatus) =>
    order.statusEvents?.find((event) => event.status === status)?.createdAt;

  return (
    <div className="mx-auto max-w-300">
      <header className="border-b border-slate-200 pb-5 sm:pb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink render={<Link href="/account" />}>{t("dash.orderDetail.crumbAccount")}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink render={<Link href="/account/orders" />}>{t("dash.orderDetail.crumbOrders")}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>#{order.orderNumber}</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold text-ink sm:text-4xl">{t("dash.orderDetail.heading", { number: order.orderNumber })}</h1>
              <Badge variant={statusVariant[order.status]}>{t(STEP_KEYS[order.status])}</Badge>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted">
              <Clock className="size-4" /> {t("dash.orderDetail.placedOn", { date: formatDateTime(order.createdAt) })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrderSupportDialog
              reason="edit"
              trigger={
                <Button type="button" variant="outline" className="h-auto gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase">
                  <Headset className="size-4" /> {t("dash.orderDetail.needChanges")}
                </Button>
              }
            />
            <Button type="button" variant="outline" onClick={() => window.print()} className="h-auto gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase">
              <Printer className="size-4" /> {t("dash.orderDetail.printInvoice")}
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-6 space-y-5 sm:space-y-6">
        {order.status === "WAITLISTED" && (
          <div className="rounded-2xl bg-[#fef3c7] p-5 text-sm text-[#92400e] sm:p-6">
            <p className="font-bold">{t("dash.orderDetail.waitlistedTitle")}</p>
            <p className="mt-1">
              {t("dash.orderDetail.waitlistedBody")}
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {[
            { key: "amount", icon: Wallet, label: t("dash.orderDetail.totalAmount"), value: formatPrice(order.total), note: null },
            { key: "date", icon: CalendarDays, label: t("dash.orderDetail.orderDate"), value: formatDateTime(order.createdAt).split(",")[0], note: order.expectedDeliveryAt ? t("dash.orderDetail.expected", { date: new Date(order.expectedDeliveryAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) }) : null },
            { key: "items", icon: Boxes, label: t("dash.orderDetail.totalItems"), value: t("dash.orderDetail.types", { count: items.length }), note: t("dash.orderDetail.volumeTotal", { volume: totalVolumeSqm.toLocaleString() }) },
          ].map(({ key, icon: Icon, label, value, note }) => (
            <article key={key} className="rounded-2xl bg-white p-5 transition-transform duration-200 active:scale-95 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-bold tracking-wider text-muted uppercase">{label}</span>
                <Icon className="size-5 text-muted" />
              </div>
              <p className="mt-3 truncate font-data text-xl font-bold text-ink sm:text-2xl">{value}</p>
              {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
            </article>
          ))}
        </div>

        <div className="grid items-start gap-5 sm:gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="space-y-5 sm:space-y-6">
            <section className="overflow-hidden rounded-2xl bg-white">
              <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-bold text-ink sm:text-2xl">{t("dash.orderDetail.orderItems")}</h2>
                <Badge variant="secondary">{t("dash.orderDetail.itemsCount", { count: items.length })}</Badge>
              </div>
              <Separator className="bg-slate-100" />
              <div className="md:hidden">
                <ul className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <li key={item.id} className="px-5 py-5 sm:px-6">
                      <Link href={`/products/${item.productId}`} className="flex items-center gap-4">
                        {item.product?.image && (
                          <Image src={item.product.image} alt={item.product.name} width={80} height={80} unoptimized className="size-16 shrink-0 rounded-sm object-cover sm:size-20" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-ink uppercase">{item.product?.name ?? "—"}</span>
                          <span className="mt-1 block text-sm text-muted">
                            {t("dash.orderDetail.boxes", { count: item.boxes })}{item.additionalPieces > 0 ? t("dash.orderDetail.plusPieces", { count: item.additionalPieces }) : ""} · {t("dash.orderDetail.unitPriceShort", { price: formatPrice(item.unitPrice) })}
                          </span>
                        </span>
                        <span className="shrink-0 text-right font-semibold text-ink">{formatPrice(item.totalPrice)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader><TableRow><TableHead>{t("dash.orderDetail.product")}</TableHead><TableHead>{t("dash.orderDetail.quantity")}</TableHead><TableHead>{t("dash.orderDetail.unitPrice")}</TableHead><TableHead>{t("dash.orderDetail.totalCol")}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-ink uppercase">
                          <Link href={`/products/${item.productId}`} className="flex items-center gap-3 hover:underline">
                            {item.product?.image && (
                              <Image src={item.product.image} alt={item.product.name} width={80} height={80} unoptimized className="size-16 shrink-0 rounded-sm object-cover" />
                            )}
                            <span>{item.product?.name ?? "—"}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-ink">
                          <span className="block">{billedAreaOf(item)} m²</span>
                          <RequestedAreaNote item={item} />
                          <span className="mt-1 block text-xs text-muted">{t("dash.orderDetail.boxes", { count: item.boxes })}{item.additionalPieces > 0 ? t("dash.orderDetail.plusPieces", { count: item.additionalPieces }) : ""} ({item.totalPieces} pcs)</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted">{formatPrice(item.unitPrice)} / m²</TableCell>
                        <TableCell className="whitespace-nowrap font-semibold text-ink">{formatPrice(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-end gap-4 bg-primary px-5 py-5 sm:px-10">
                <span className="text-lg font-semibold text-ink">{t("dash.orderDetail.total")}</span>
                <span className="text-xl font-bold text-ink sm:text-2xl">{formatPrice(order.total)}</span>
              </div>
            </section>

            <CustomerQuotationCard
              orderId={order.id}
              subtotalValue={Number(order.subtotal)}
              quotationStatus={order.quotationStatus}
              transportFee={order.transportFee ? Number(order.transportFee) : null}
              onUpdated={reload}
            />
          </div>

          <div className="space-y-5 sm:space-y-6">
            <DeliveryDetailsCard
              orderId={order.id}
              initial={order.delivery}
              locked={order.quotationStatus !== "AWAITING_REVIEW"}
              onSaved={reload}
            />

            <OrderNegotiationPanel orderId={order.id} />

            {!isCancelled ? (
              <section className="rounded-2xl bg-white p-5 sm:p-6">
                <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-secondary"><History className="size-5" /></span><h2 className="text-lg font-bold text-ink sm:text-xl">{t("dash.orderDetail.timeline")}</h2></div>
                <ol className="mt-5 space-y-6 border-l border-slate-200 pl-6">
                  {ACTIVE_STEPS.map((step, index) => {
                    const timestamp = eventAt(step);
                    const state = index < currentStepIndex ? "done" : index === currentStepIndex ? "current" : "pending";
                    return (
                      <li key={step} className="relative">
                        <span className={"absolute top-1.5 -left-[31px] flex size-3 items-center justify-center rounded-full border-2 " + (state === "pending" ? "border-slate-200 bg-white" : "border-ink bg-primary")}>
                          {state === "done" ? <Check className="size-2 text-ink" /> : null}
                        </span>
                        <div className={state === "current" ? "rounded-lg bg-primary p-3" : ""}>
                          <p className={"text-[11px] font-bold tracking-wider uppercase " + (state === "pending" ? "text-muted" : "text-ink")}>{t(STEP_KEYS[step])}</p>
                          {timestamp ? <p className="mt-0.5 font-data text-xs text-muted">{formatDateTime(timestamp)}</p> : null}
                          <p className={"mt-1 text-xs " + (state === "pending" ? "text-muted" : "text-ink")}>
                            {state === "done"
                              ? t("dash.orderDetail.stepDone")
                              : state === "current"
                                ? timestamp
                                  ? t("dash.orderDetail.stepDone")
                                  : t("dash.orderDetail.stepInProgress")
                                : t("dash.orderDetail.stepPending")}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {order.status !== "DELIVERED" && (
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <OrderSupportDialog
                      reason="stuck"
                      trigger={
                        <button type="button" className="flex items-center gap-1.5 text-xs font-semibold text-ink hover:underline">
                          <Headset className="size-3.5" /> {t("dash.orderDetail.notMoving")}
                        </button>
                      }
                    />
                  </div>
                )}
              </section>
            ) : (
              <section className="rounded-2xl bg-red-50 p-5 text-sm font-medium text-red-700 sm:p-6">
                {t("dash.orderDetail.cancelled")}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountOrderDetailsPage;

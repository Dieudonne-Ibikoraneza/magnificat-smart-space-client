"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Plus, Minus, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CartSkeleton } from "@/components/skeletons";
import { stockLabels } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeliveryDetailsDialog, type DeliverySubmitResult } from "@/components/delivery-details-dialog";
import { CartNegotiationChat, type CartLineSummary } from "@/components/cart-negotiation-chat";
import { toast } from "@/components/ui/toast";
import { ordersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useCart, type CartLine } from "@/lib/cart-store";
import { useCurrentUser } from "@/lib/current-user";
import type { DeliveryDetails } from "@/lib/domain-types";
import type { StockShortage } from "@/lib/api/types";

const formatPrice = (value: number) => `RWF ${Math.round(value).toLocaleString()}`;

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof ApiError ? cause.message : fallback;

const CartPage = () => {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const cart = useCart();
  const [submitted, setSubmitted] = useState<{
    deliveryDetails: DeliveryDetails;
    orderId: string;
    /** True when part of the cart exceeded stock on hand — the order was still accepted, just waitlisted (see `handleOrderSubmit`) instead of going straight to review. */
    waitlisted: boolean;
  } | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  /** Bumped whenever a "Place Order" attempt gets rejected as unfulfillable —
   * the server opens/continues the customer's cart negotiation thread for
   * that in the same call, invisibly to `CartNegotiationChat`'s own state, so
   * this is the signal that tells it to go fetch the thread again. */
  const [negotiationRefreshToken, setNegotiationRefreshToken] = useState(0);
  /** What's currently typed in a quantity box, kept separate from the committed value so a mid-edit "" or "3." doesn't get clobbered by the store's clamped/rounded number. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const clearDraft = (productId: string) =>
    setDrafts((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });

  const displayArea = (line: CartLine) => drafts[line.productId] ?? String(line.areaSqm);

  const setQuantityTyped = (line: CartLine, raw: string) => {
    setDrafts((current) => ({ ...current, [line.productId]: raw }));
    const parsed = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(parsed) && parsed > 0) {
      cart.setQuantity(line.product, parsed);
    }
  };

  const nudgeQuantity = (line: CartLine, change: number) => {
    clearDraft(line.productId);
    cart.setQuantity(line.product, line.areaSqm + change);
  };

  /**
   * Tracks the quantity actually typed for each line (`exceedsStock`, from
   * `cart.service.ts`'s per-line verdict) rather than the
   * product's general `stockStatus` badge — that stays fixed regardless of
   * how much of it is in the cart, so it flagged every line as short even
   * once the customer lowered the quantity to something well within stock.
   */
  const shortages: StockShortage[] = cart.lines
    .filter((line) => line.exceedsStock)
    .map((line) => ({
      productId: line.productId,
      productName: line.product.name,
      requestedAreaSqm: line.quantity.purchasedArea,
    }));

  const shortageFor = (productId: string) => shortages.find((shortage) => shortage.productId === productId);

  /** Every cart line, not just the short ones — what "Share my cart" sends the stock team. */
  // `stockLabels`, never an exact available area — that number is staff-only
  // everywhere in the app (doc 3.2), the cart response included, and a
  // negotiation chat the customer can read is no exception.
  const cartNegotiationItems: CartLineSummary[] = cart.lines.map((line) => ({
    productId: line.productId,
    productName: line.product.name,
    requestedAreaSqm: line.quantity.purchasedArea,
    availabilityNote: stockLabels[line.product.stockStatus],
  }));

  /**
   * One request: the order and its delivery details are created together, so a
   * failure can't leave an order behind (a retry would then place a second one
   * and hold the stock twice). The dialog stays open on failure and closes only
   * once the order exists.
   */
  const handleOrderSubmit = async (deliveryDetails: DeliveryDetails): Promise<DeliverySubmitResult> => {
    setPlacingOrder(true);
    try {
      const result = await ordersApi.create({
        type: "PURCHASE",
        items: cart.lines.map((line) => ({ productId: line.productId, areaSqm: line.areaSqm })),
        delivery: {
          contactName: deliveryDetails.contactName,
          phone: deliveryDetails.phone,
          address: deliveryDetails.address,
          city: deliveryDetails.city,
          preferredDate: deliveryDetails.preferredDate || undefined,
          notes: deliveryDetails.notes || undefined,
        },
      });

      if (!result.orderCreated) {
        // Part of the cart exceeds what's on hand *in total*, not just
        // what's currently unreserved — no waitlist can fix that, only a
        // restock can, so no order was created. The server already
        // opened/continued the cart negotiation thread below; the cart
        // itself is left untouched so the customer can adjust it themselves
        // instead.
        setNegotiationRefreshToken((token) => token + 1);
        toast.warning(t("dash.cart.toastCantPlaceTitle"), {
          description: t("dash.cart.toastCantPlaceBody"),
        });
        return "dismiss";
      }

      const order = result.order;
      const waitlisted = order.status === "WAITLISTED";
      cart.clear();
      setSubmitted({ deliveryDetails, orderId: order.id, waitlisted });
      toast.success(waitlisted ? t("dash.cart.toastWaitlistedTitle") : t("dash.cart.toastSubmittedTitle"), {
        description: waitlisted ? t("dash.cart.toastWaitlistedBody") : t("dash.cart.toastSubmittedBody"),
      });
      return "dismiss";
    } catch (cause) {
      toast.error(t("dash.cart.toastPlaceFailedTitle"), { description: errorMessage(cause, t("dash.tryAgain")) });
      return "retry";
    } finally {
      setPlacingOrder(false);
    }
  };

  const quotationDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const printQuotation = () => window.print();

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
          <span className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="size-8" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-ink">
            {submitted.waitlisted ? t("dash.cart.waitlistedTitle") : t("dash.cart.submittedTitle")}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            {submitted.waitlisted ? t("dash.cart.waitlistedBody") : t("dash.cart.submittedBody")}
          </p>
          <div className="mt-6 w-full max-w-sm rounded-2xl bg-[#F9FAFB] p-4 text-left text-sm">
            <p className="text-[11px] font-bold tracking-wider text-muted uppercase">{t("dash.cart.deliveryTo")}</p>
            <p className="mt-1 font-semibold text-ink">{submitted.deliveryDetails.contactName} · {submitted.deliveryDetails.phone}</p>
            <p className="text-muted">{submitted.deliveryDetails.address}, {submitted.deliveryDetails.city}</p>
          </div>
          <Button nativeButton={false} render={<Link href="/account/orders" />} className="mt-6 h-11 gap-2 px-5">
            {t("dash.cart.viewMyOrders")} <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Only the very first read (before even the local cache lands) has nothing
  // to show yet — a background resync never blanks the page, see `useCart`.
  if (cart.loading && cart.lines.length === 0) {
    return <CartSkeleton />;
  }

  return (
    <div className="max-w-360 mx-auto">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl text-ink sm:text-2xl">
          <strong>{t("dash.cart.selectionTitle")}</strong>
          {" "}<span className="font-normal">{t("dash.cart.itemsCount", { count: cart.lines.length })}</span>
        </h1>
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="ghost"
              disabled={cart.lines.length === 0}
              className="gap-2 px-0 text-red-500 hover:bg-transparent hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 className="size-5" /> {t("dash.cart.clearCart")}
            </Button>
          }
          title={t("dash.cart.clearCartTitle")}
          description={t("dash.cart.clearCartDescription")}
          confirmLabel={t("dash.cart.clearCartConfirm")}
          onConfirm={() => {
            cart.clear();
            toast.success(t("dash.cart.toastCartCleared"));
          }}
        />
      </div>
      <div className="mx-auto grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section>
          <div className="space-y-4">
            {cart.lines.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                <span className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-ink"><ShoppingCart className="size-8" /></span>
                <h2 className="mt-5 text-xl font-bold text-ink">{t("dash.cart.emptyTitle")}</h2>
                <p className="mt-2 max-w-sm text-sm text-muted">{t("dash.cart.emptyBody")}</p>
                <Button
                  nativeButton={false}
                  render={<Link href="/" />}
                  className="mt-5 h-11 gap-2 px-5"
                >
                  {t("dash.cart.browseProducts")} <ArrowRight className="size-4" />
                </Button>
              </div>
            ) : (
              cart.lines.map((line) => {
                const shortage = shortageFor(line.productId);
                return (
                <article
                  key={line.productId}
                  className="grid overflow-hidden rounded-2xl bg-white shadow-sm sm:grid-cols-[220px_minmax(0,1fr)]"
                >
                  <div className="relative aspect-[1.35/1] bg-muted-background sm:aspect-auto sm:min-h-64">
                    <Image
                      src={line.product.image}
                      alt={line.product.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="relative flex flex-col p-4 sm:p-5">
                    <div className="absolute right-4 top-4 flex items-center gap-2 text-ink sm:right-5 sm:top-5">
                      <Button
                        nativeButton={false}
                        render={<Link href={`/products/${line.productId}`} />}
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("dash.cart.viewProductAria")}
                        className="size-8"
                      >
                        <ExternalLink className="size-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("dash.cart.removeItemAria")}
                        onClick={() => cart.removeItem(line.productId)}
                        className="size-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-5" />
                      </Button>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#d4c09e]">
                      {line.product.collection} · {line.product.size}
                    </p>
                    <h2 className="mt-1 text-base font-bold text-ink">{line.product.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-muted-background px-3 py-2">
                        <strong>{t("dash.cart.size")}</strong> {line.product.size}
                      </span>
                      <span className="rounded-lg bg-muted-background px-3 py-2">
                        <strong>{t("dash.cart.coverage")}</strong> {t("dash.cart.coverageValue", { value: line.product.boxCoverage })}
                      </span>
                    </div>
                    <div className="mt-2 flex w-fit flex-col items-start gap-2 text-sm font-semibold">
                      <div className="flex items-center rounded-lg border border-slate-200 p-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("dash.cart.decreaseAria")}
                          onClick={() => nudgeQuantity(line, -1)}
                          className="size-9 rounded-none"
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={displayArea(line)}
                          onChange={(event) => setQuantityTyped(line, event.target.value)}
                          onBlur={() => clearDraft(line.productId)}
                          onFocus={(event) => event.target.select()}
                          aria-label={t("dash.cart.quantityAria", { name: line.product.name })}
                          className="h-9 w-16 border-x border-slate-200 text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("dash.cart.increaseAria")}
                          onClick={() => nudgeQuantity(line, 1)}
                          className="size-9 rounded-none"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                        <span className="px-2">sqm</span>
                      </div>
                      <p className="w-full text-right text-xs font-normal text-muted">
                        {t("dash.cart.boxesLine", { boxes: line.quantity.completeBoxes, pieces: line.quantity.remainingPieces, total: line.quantity.totalPieces })}
                      </p>
                    </div>
                    {shortage && (
                      <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <span>
                          <span className="font-bold">
                            {t("dash.cart.shortageBold", { area: shortage.requestedAreaSqm })}
                          </span>{" "}
                          {t("dash.cart.shortageBody")}
                        </span>
                      </p>
                    )}
                    <p className="mt-6 text-xs text-muted">
                      {formatPrice(line.product.price)}
                      <span className="ml-1 font-normal">{t("dash.cart.perSqm")}</span>
                    </p>
                    <p className="text-xl font-bold text-ink">
                      {formatPrice(line.totalPrice)}
                    </p>
                  </div>
                </article>
                );
              })
            )}
          </div>
        </section>
        <aside className="h-fit rounded-3xl bg-white p-6 sm:p-8 xl:sticky xl:top-24">
          <h2 className="text-xl font-bold text-ink">{t("dash.cart.orderOverview")}</h2>
          <div className="mt-7 flex items-center justify-between border-b border-slate-200 pb-5 text-sm">
            <span>{t("dash.cart.subtotalLine", { count: cart.lines.length })}</span>
            <strong className="text-xl">{formatPrice(cart.total)}</strong>
          </div>
          <div className="flex items-center justify-between py-5">
            <strong>{t("dash.cart.totalCost")}</strong>
            <strong className="text-2xl">{formatPrice(cart.total)}</strong>
          </div>
          <DeliveryDetailsDialog
            onSubmit={handleOrderSubmit}
            trigger={
              <Button
                type="button"
                disabled={cart.lines.length === 0 || placingOrder}
                className="relative h-14 w-full justify-center px-5 text-base font-bold disabled:pointer-events-auto disabled:cursor-not-allowed"
              >
                {placingOrder ? t("dash.cart.placingOrder") : t("dash.cart.placeOrder")} <ArrowRight className="absolute right-5 size-5" />
              </Button>
            }
          />
          {shortages.length > 0 && (
            <p className="mt-3 text-center text-xs font-medium text-amber-800">
              {shortages.length === 1
                ? t("dash.cart.shortagesOne")
                : t("dash.cart.shortagesMany", { count: shortages.length })}
            </p>
          )}
          <div className="my-5 flex items-center gap-4 text-sm text-muted">
            <span className="h-px flex-1 bg-slate-200" />
            {t("dash.cart.or")}
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={cart.lines.length === 0}
            onClick={printQuotation}
            className="h-14 w-full text-base text-muted disabled:pointer-events-auto disabled:cursor-not-allowed"
          >
            {t("dash.cart.generateQuotation")}
          </Button>
        </aside>
      </div>

      <CartNegotiationChat
        shortages={shortages}
        cartItems={cartNegotiationItems}
        refreshToken={negotiationRefreshToken}
      />

      <section id="quotation-print" aria-hidden="true" className="quotation-printable mx-auto max-w-4xl bg-white p-5 text-ink sm:p-10">
        <header className="flex items-start justify-between gap-8 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9f8355]">{t("dash.cart.quote.eyebrow")}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Magnificat Smart Space</h2>
            <p className="mt-2 text-sm text-muted">{t("dash.cart.quote.brandTagline")}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-ink">{t("dash.cart.quote.date")}</p>
            <p className="mt-1 text-muted">{quotationDate}</p>
          </div>
        </header>

        <section className="mt-7 border-b border-slate-200 pb-7">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">{t("dash.cart.quote.customerDetails")}</h3>
          <div className="mt-3 grid gap-1 text-sm">
            <p className="font-semibold">{user?.fullName ?? "—"}</p>
            <p className="text-muted">{[user?.email, user?.phone].filter(Boolean).join(" · ")}</p>
          </div>
        </section>

        <div className="mt-7">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="pb-3 pr-4 font-bold">{t("dash.cart.quote.item")}</th>
                <th className="pb-3 px-4 text-right font-bold">{t("dash.cart.quote.quantity")}</th>
                <th className="pb-3 px-4 text-right font-bold">{t("dash.cart.quote.totalPrice")}</th>
              </tr>
            </thead>
            <tbody>
              {cart.lines.map((line) => (
                <tr key={line.productId} className="border-b border-slate-100">
                  <td className="py-4 pr-4"><span className="font-semibold">{line.product.name}</span><span className="block text-xs text-muted">{line.product.collection} · {line.product.size}</span></td>
                  {/* Billed on `purchasedArea` (rounded up to whole pieces), same basis as `totalPrice` below — showing the raw typed `areaSqm` here would make quantity × unit price not match the printed total. */}
                  <td className="px-4 py-4 text-right">
                    {line.quantity.purchasedArea} {t("dash.cart.quote.sqm")}
                    <span className="block text-xs font-normal text-muted">
                      {t("dash.cart.boxesLine", { boxes: line.quantity.completeBoxes, pieces: line.quantity.remainingPieces, total: line.quantity.totalPieces })}
                    </span>
                  </td>
                  <td className="py-4 pl-4 text-right font-semibold">{formatPrice(line.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="mt-7 flex justify-end border-t border-slate-300 pt-5">
          <div className="flex w-full max-w-xs items-center justify-between gap-8 text-lg font-bold">
            <span>{t("dash.cart.quote.totalQuotation")}</span>
            <span>{formatPrice(cart.total)}</span>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default CartPage;

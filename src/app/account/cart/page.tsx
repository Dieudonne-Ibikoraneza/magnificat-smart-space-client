"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Plus, Minus, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { CartSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeliveryDetailsDialog } from "@/components/delivery-details-dialog";
import { CartNegotiationChat, type CartLineSummary } from "@/components/cart-negotiation-chat";
import { toast } from "@/components/ui/toast";
import { ordersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useCart, type CartLine } from "@/lib/cart-store";
import { useCurrentUser } from "@/lib/current-user";
import type { DeliveryDetails } from "@/data/order-workflow";
import type { StockShortage } from "@/lib/api/types";

const formatPrice = (value: number) => `RWF ${Math.round(value).toLocaleString()}`;

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof ApiError ? cause.message : fallback;

const CartPage = () => {
  const { user } = useCurrentUser();
  const cart = useCart();
  // Note: this page's own order-creation call never comes back with a
  // shortage anymore — a customer's over-stock cart is intercepted into a
  // negotiation before any order exists (see handleOrderSubmit) — so this
  // success screen only ever represents a clean, fully-covered order.
  const [submitted, setSubmitted] = useState<{
    deliveryDetails: DeliveryDetails;
    orderId: string;
  } | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  /** Bumped when the server opens a negotiation behind the scenes (a blocked "Place Order" attempt), so CartNegotiationChat refetches and surfaces it. */
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
   * `cart.service.ts`'s per-line `availableAreaSqm`) rather than the
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
      availableAreaSqm: line.product.availableAreaSqm ?? 0,
    }));

  const shortageFor = (productId: string) => shortages.find((shortage) => shortage.productId === productId);

  /** Every cart line, not just the short ones — what "Share my cart" sends the stock team. */
  const cartNegotiationItems: CartLineSummary[] = cart.lines.map((line) => {
    const availableAreaSqm = line.product.availableAreaSqm ?? 0;
    return {
      productId: line.productId,
      productName: line.product.name,
      requestedAreaSqm: line.quantity.purchasedArea,
      availabilityNote: line.exceedsStock
        ? availableAreaSqm > 0
          ? `${availableAreaSqm} m² available`
          : "Out of stock"
        : "In stock",
    };
  });

  const handleOrderSubmit = async (deliveryDetails: DeliveryDetails) => {
    setPlacingOrder(true);
    try {
      const result = await ordersApi.create({
        type: "PURCHASE",
        items: cart.lines.map((line) => ({ productId: line.productId, areaSqm: line.areaSqm })),
      });

      if (!result.orderCreated) {
        // The cart's "Place Order" button is already disabled whenever a
        // shortage shows locally, so this only fires on a stale snapshot or a
        // concurrent order draining stock between page load and checkout. The
        // server already opened the negotiation thread (seeded with the full
        // cart) — refresh so the shortage banner/button catch up, and bump
        // the chat so it picks up that thread and opens instead of the
        // customer having to notice and click it themselves.
        cart.refresh();
        setNegotiationRefreshToken((token) => token + 1);
        toast.warning("Stock changed just now", {
          description: "Part of your cart is no longer available in full — we've opened a chat with our stock team below.",
        });
        return;
      }

      const order = result.order;
      await ordersApi.saveDeliveryDetails(order.id, {
        contactName: deliveryDetails.contactName,
        phone: deliveryDetails.phone,
        address: deliveryDetails.address,
        city: deliveryDetails.city,
        preferredDate: deliveryDetails.preferredDate || undefined,
        notes: deliveryDetails.notes || undefined,
      });
      cart.clear();
      setSubmitted({ deliveryDetails, orderId: order.id });
      toast.success("Order submitted", {
        description: "Sent to our stock team for review. You'll find it under My Orders once it's confirmed.",
      });
    } catch (cause) {
      toast.error("Couldn't place order", { description: errorMessage(cause, "Please try again.") });
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
          <h1 className="mt-5 text-2xl font-bold text-ink">Order submitted</h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            Thanks — your order has been sent to our stock team for review. We&apos;ll prepare a full quotation,
            including transport fees and payment details, and notify you here once it&apos;s ready.
          </p>
          <div className="mt-6 w-full max-w-sm rounded-2xl bg-[#F9FAFB] p-4 text-left text-sm">
            <p className="text-[11px] font-bold tracking-wider text-muted uppercase">Delivery to</p>
            <p className="mt-1 font-semibold text-ink">{submitted.deliveryDetails.contactName} · {submitted.deliveryDetails.phone}</p>
            <p className="text-muted">{submitted.deliveryDetails.address}, {submitted.deliveryDetails.city}</p>
          </div>
          <Button nativeButton={false} render={<Link href="/account/orders" />} className="mt-6 h-11 gap-2 px-5">
            View My Orders <ArrowRight className="size-4" />
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
          <strong>Your selection</strong>
          {" "}<span className="font-normal">({cart.lines.length} items)</span>
        </h1>
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="ghost"
              disabled={cart.lines.length === 0}
              className="gap-2 px-0 text-red-500 hover:bg-transparent hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 className="size-5" /> Clear Cart
            </Button>
          }
          title="Clear your cart?"
          description="This removes every item from your selection. This can't be undone."
          confirmLabel="Clear cart"
          onConfirm={() => {
            cart.clear();
            toast.success("Cart cleared");
          }}
        />
      </div>
      <div className="mx-auto grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section>
          <div className="space-y-4">
            {cart.lines.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                <span className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-ink"><ShoppingCart className="size-8" /></span>
                <h2 className="mt-5 text-xl font-bold text-ink">Your cart is empty</h2>
                <p className="mt-2 max-w-sm text-sm text-muted">Explore our collection and add the perfect tiles for your next project.</p>
                <Button
                  nativeButton={false}
                  render={<Link href="/" />}
                  className="mt-5 h-11 gap-2 px-5"
                >
                  Browse products <ArrowRight className="size-4" />
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
                        aria-label="View product"
                        className="size-8"
                      >
                        <ExternalLink className="size-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove item"
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
                        <strong>Size:</strong> {line.product.size}
                      </span>
                      <span className="rounded-lg bg-muted-background px-3 py-2">
                        <strong>Coverage:</strong> {line.product.boxCoverage} m²/box
                      </span>
                    </div>
                    <div className="mt-2 flex w-fit flex-col items-start gap-2 text-sm font-semibold">
                      <div className="flex items-center rounded-lg border border-slate-200 p-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Decrease quantity"
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
                          aria-label={`Quantity for ${line.product.name}, in sqm`}
                          className="h-9 w-16 border-x border-slate-200 text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Increase quantity"
                          onClick={() => nudgeQuantity(line, 1)}
                          className="size-9 rounded-none"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                        <span className="px-2">sqm</span>
                      </div>
                      <p className="w-full text-right text-xs font-normal text-muted">
                        {line.quantity.completeBoxes} boxes + {line.quantity.remainingPieces} pcs · {line.quantity.totalPieces} pcs total
                      </p>
                    </div>
                    {shortage && (
                      <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <span>
                          <span className="font-bold">
                            The full {shortage.requestedAreaSqm} m² requested isn&apos;t available right now.
                          </span>{" "}
                          Lower the quantity, or chat with our stock team below to work out the rest.
                        </span>
                      </p>
                    )}
                    <p className="mt-6 text-xs text-muted">
                      {formatPrice(line.product.price)}
                      <span className="ml-1 font-normal">/ sqm</span>
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
        <aside className="h-fit rounded-3xl bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-ink">ORDER OVERVIEW</h2>
          <div className="mt-7 flex items-center justify-between border-b border-slate-200 pb-5 text-sm">
            <span>Subtotal ({cart.lines.length} items)</span>
            <strong className="text-xl">{formatPrice(cart.total)}</strong>
          </div>
          <div className="flex items-center justify-between py-5">
            <strong>Total Cost</strong>
            <strong className="text-2xl">{formatPrice(cart.total)}</strong>
          </div>
          <DeliveryDetailsDialog
            onSubmit={(details) => void handleOrderSubmit(details)}
            trigger={
              <Button
                type="button"
                disabled={cart.lines.length === 0 || shortages.length > 0 || placingOrder}
                className="relative h-14 w-full justify-center px-5 text-base font-bold disabled:pointer-events-auto disabled:cursor-not-allowed"
              >
                {placingOrder ? "Placing order…" : "Place Order"} <ArrowRight className="absolute right-5 size-5" />
              </Button>
            }
          />
          {shortages.length > 0 && (
            <p className="mt-3 text-center text-xs font-medium text-amber-800">
              We can&apos;t place this order yet — {shortages.length === 1 ? "one item exceeds" : `${shortages.length} items exceed`} what&apos;s
              currently in stock. Chat with our stock team below to work it out.
            </p>
          )}
          <div className="my-5 flex items-center gap-4 text-sm text-muted">
            <span className="h-px flex-1 bg-slate-200" />
            OR
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={cart.lines.length === 0}
            onClick={printQuotation}
            className="h-14 w-full text-base text-muted disabled:pointer-events-auto disabled:cursor-not-allowed"
          >
            Generate Quotation
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9f8355]">Quotation</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Magnificat Smart Space</h2>
            <p className="mt-2 text-sm text-muted">Design smart, live beautifully.</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-ink">Quotation date</p>
            <p className="mt-1 text-muted">{quotationDate}</p>
          </div>
        </header>

        <section className="mt-7 border-b border-slate-200 pb-7">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Customer details</h3>
          <div className="mt-3 grid gap-1 text-sm">
            <p className="font-semibold">{user?.fullName ?? "—"}</p>
            <p className="text-muted">{[user?.email, user?.phone].filter(Boolean).join(" · ")}</p>
          </div>
        </section>

        <div className="mt-7">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="pb-3 pr-4 font-bold">Item</th>
                <th className="pb-3 px-4 text-right font-bold">Quantity</th>
                <th className="pb-3 px-4 text-right font-bold">Total price</th>
              </tr>
            </thead>
            <tbody>
              {cart.lines.map((line) => (
                <tr key={line.productId} className="border-b border-slate-100">
                  <td className="py-4 pr-4"><span className="font-semibold">{line.product.name}</span><span className="block text-xs text-muted">{line.product.collection} · {line.product.size}</span></td>
                  <td className="px-4 py-4 text-right">{line.areaSqm} sqm</td>
                  <td className="py-4 pl-4 text-right font-semibold">{formatPrice(line.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="mt-7 flex justify-end border-t border-slate-300 pt-5">
          <div className="flex w-full max-w-xs items-center justify-between gap-8 text-lg font-bold">
            <span>Total quotation</span>
            <span>{formatPrice(cart.total)}</span>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default CartPage;

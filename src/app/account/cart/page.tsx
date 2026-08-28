"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Plus, Minus, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeliveryDetailsDialog } from "@/components/delivery-details-dialog";
import { CartNegotiationChat } from "@/components/cart-negotiation-chat";
import { stockLabels, stockStyles } from "@/components/product-card";
import { toast } from "@/components/ui/toast";
import { products } from "@/data/catalog";
import type { DeliveryDetails } from "@/data/order-workflow";
import { getStockShortage } from "@/lib/stock-availability";

type CartItem = {
  id: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
};

const initialCart: CartItem[] = [
  {
    id: "9",
    name: "Calacatta Gold Polished",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=700&q=85",
    quantity: 45,
    unitPrice: 15500,
  },
  {
    id: "2",
    name: "Calacatta Gold Polished",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=700&q=85&sat=-20",
    quantity: 45,
    unitPrice: 15500,
  },
];

const formatPrice = (value: number) => `RWF ${value.toLocaleString()}`;

const CartPage = () => {
  const [items, setItems] = useState(initialCart);
  const [submitted, setSubmitted] = useState<{ deliveryDetails: DeliveryDetails } | null>(null);
  const subtotal = useMemo(
    () =>
      items.reduce((total, item) => total + item.quantity * item.unitPrice, 0),
    [items],
  );

  const shortages = useMemo(
    () =>
      items
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.id);
          return product ? getStockShortage(product, item.quantity) : null;
        })
        .filter((shortage): shortage is NonNullable<typeof shortage> => shortage !== null),
    [items],
  );

  const shortageFor = (id: string) => shortages.find((shortage) => shortage.productId === id);

  const handleOrderSubmit = (deliveryDetails: DeliveryDetails) => {
    setSubmitted({ deliveryDetails });
    setItems([]);
    toast.success("Order submitted", {
      description: "Sent to our stock team for review. You'll find it under My Orders once it's confirmed.",
    });
  };

  const updateQuantity = (id: string, change: number) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.round(Math.max(0.01, item.quantity + change) * 100) / 100 }
          : item,
      ),
    );
  };

  /** Lets the customer type an exact sqm amount (decimals included), not just nudge by whole units. */
  const setQuantityDirect = (id: string, raw: string) => {
    const parsed = Number(raw);
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: raw === "" ? 0 : Number.isFinite(parsed) ? Math.max(0, parsed) : item.quantity }
          : item,
      ),
    );
  };

  const removeItem = (id: string) =>
    setItems((current) => current.filter((item) => item.id !== id));

  const quotationDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const printQuotation = () => window.print();

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
          <span className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="size-8" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-ink">Order submitted</h1>
          <p className="mt-2 max-w-md text-sm text-muted">
            Thanks — your order has been sent to our stock team for review. We&apos;ll prepare a full quotation, including transport fees and payment details, and notify you here once it&apos;s ready.
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

  return (
    <div className="max-w-360 mx-auto">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl text-ink sm:text-2xl">
          <strong>Your selection</strong>
          {" "}<span className="font-normal">({items.length} items)</span>
        </h1>
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="ghost"
              disabled={items.length === 0}
              className="gap-2 px-0 text-red-500 hover:bg-transparent hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 className="size-5" /> Clear Cart
            </Button>
          }
          title="Clear your cart?"
          description="This removes every item from your selection. This can't be undone."
          confirmLabel="Clear cart"
          onConfirm={() => {
            setItems([]);
            toast.success("Cart cleared");
          }}
        />
      </div>
      <div className="mx-auto grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section>
          <div className="space-y-4">
            {items.length === 0 ? (
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
              items.map((item) => {
                const shortage = shortageFor(item.id);
                return (
                <article
                  key={item.id}
                  className="grid overflow-hidden rounded-2xl bg-white shadow-sm sm:grid-cols-[220px_minmax(0,1fr)]"
                >
                  <div className="relative aspect-[1.35/1] bg-muted-background sm:aspect-auto sm:min-h-64">
                    <Image
                      src={item.image}
                      alt="Calacatta Gold Polished"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="relative flex flex-col p-4 sm:p-5">
                    <div className="absolute right-4 top-4 flex items-center gap-2 text-ink sm:right-5 sm:top-5">
                      <Button
                        nativeButton={false}
                        render={<Link href={`/products/${item.id}`} />}
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
                        onClick={() => removeItem(item.id)}
                        className="size-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-5" />
                      </Button>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#d4c09e]">
                      Floor Tile · 60×60cm
                    </p>
                    <h2 className="mt-1 text-base font-bold text-ink">{item.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-muted-background px-3 py-2">
                        <strong>Size:</strong> 60×120cm
                      </span>
                      <span className="rounded-lg bg-muted-background px-3 py-2">
                        <strong>Finish:</strong> Polished
                      </span>
                    </div>
                    <div className="mt-2 flex w-fit flex-col items-start gap-2 text-sm font-semibold">
                      <div className="flex items-center rounded-lg border border-slate-200 p-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="size-9 rounded-none"
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={item.quantity}
                          onChange={(event) => setQuantityDirect(item.id, event.target.value)}
                          onFocus={(event) => event.target.select()}
                          aria-label={`Quantity for ${item.name}, in sqm`}
                          className="h-9 w-16 border-x border-slate-200 text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Increase quantity"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="size-9 rounded-none"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                        <span className="px-2">sqm</span>
                      </div>
                      <p className="w-full text-right text-sm font-normal text-ink">
                        <strong>{formatPrice(item.unitPrice)}</strong> /sqm
                      </p>
                    </div>
                    {shortage && (
                      <p
                        className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium ${stockStyles[shortage.status]}`}
                      >
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <span>
                          <span className="font-bold">{stockLabels[shortage.status]}.</span>{" "}
                          Your requested quantity isn&apos;t fully available — chat with our stock team below to negotiate it.
                        </span>
                      </p>
                    )}
                    <p className="mt-6 text-xl font-bold text-ink">
                      {formatPrice(item.quantity * item.unitPrice)}
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
            <span>Subtotal ({items.length} items)</span>
            <strong className="text-xl">{formatPrice(subtotal)}</strong>
          </div>
          <div className="flex items-center justify-between py-5">
            <strong>Total Cost</strong>
            <strong className="text-2xl">{formatPrice(subtotal)}</strong>
          </div>
          <DeliveryDetailsDialog
            onSubmit={handleOrderSubmit}
            trigger={
              <Button
                type="button"
                disabled={items.length === 0 || shortages.length > 0}
                className="relative h-14 w-full justify-center px-5 text-base font-bold disabled:pointer-events-auto disabled:cursor-not-allowed"
              >
                Place Order <ArrowRight className="absolute right-5 size-5" />
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
            disabled={items.length === 0}
            onClick={printQuotation}
            className="h-14 w-full text-base text-muted disabled:pointer-events-auto disabled:cursor-not-allowed"
          >
            Generate Quotation
          </Button>
        </aside>
      </div>

      <CartNegotiationChat shortages={shortages} />

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
            <p className="font-semibold">John Doe</p>
            <p className="text-muted">john.doe@example.com · +250 780 000 000</p>
          </div>
        </section>

        <div className="mt-7">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="pb-3 pr-4 font-bold">Item</th>
                <th className="pb-3 px-4 text-right font-bold">Quantity</th>
                <th className="pb-3 px-4 text-right font-bold">Unit price</th>
                <th className="pb-3 pl-4 text-right font-bold">Total price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-4 pr-4"><span className="font-semibold">{item.name}</span><span className="block text-xs text-muted">Floor Tile · 60×60cm</span></td>
                  <td className="px-4 py-4 text-right">{item.quantity} sqm</td>
                  <td className="px-4 py-4 text-right">{formatPrice(item.unitPrice)}</td>
                  <td className="py-4 pl-4 text-right font-semibold">{formatPrice(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="mt-7 flex justify-end border-t border-slate-300 pt-5">
          <div className="flex w-full max-w-xs items-center justify-between gap-8 text-lg font-bold">
            <span>Total quotation</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default CartPage;

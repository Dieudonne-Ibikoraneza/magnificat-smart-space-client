"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink, Plus, Minus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type CartItem = {
  id: string;
  image: string;
  quantity: number;
  unitPrice: number;
};

const initialCart: CartItem[] = [
  { id: "9", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=700&q=85", quantity: 45, unitPrice: 15500 },
  { id: "2", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=700&q=85&sat=-20", quantity: 45, unitPrice: 15500 },
];

const formatPrice = (value: number) => `RWF ${value.toLocaleString()}`;

const CartPage = () => {
  const [items, setItems] = useState(initialCart);
  const subtotal = useMemo(() => items.reduce((total, item) => total + item.quantity * item.unitPrice, 0), [items]);

  const updateQuantity = (id: string, change: number) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + change) } : item));
  };

  const removeItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));

  return (
    <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl text-ink sm:text-2xl"><strong>Your selection</strong> <span className="font-normal">({items.length} items)</span></h1>
          <Button type="button" variant="ghost" onClick={() => setItems([])} className="gap-2 px-0 text-red-500 hover:bg-transparent hover:text-red-600"><Trash2 className="size-5" /> Clear Cart</Button>
        </div>

        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm"><p className="text-muted">Your cart is empty.</p><Button nativeButton={false} render={<Link href="/" />} className="mt-5">Browse products</Button></div>
          ) : items.map((item) => (
            <article key={item.id} className="grid overflow-hidden rounded-3xl bg-white shadow-sm sm:grid-cols-[235px_minmax(0,1fr)]">
              <div className="relative aspect-[1.25/1] bg-muted-background sm:aspect-auto sm:min-h-80">
                <Image src={item.image} alt="Calacatta Gold Polished" fill unoptimized className="object-cover" />
              </div>
              <div className="relative flex flex-col p-5 sm:p-7">
                <div className="absolute right-5 top-5 flex items-center gap-3 text-ink sm:right-7 sm:top-7">
                  <Button nativeButton={false} render={<Link href={`/products/${item.id}`} />} type="button" variant="ghost" size="icon" aria-label="View product" className="size-8"><ExternalLink className="size-5" /></Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove item" onClick={() => removeItem(item.id)} className="size-8 text-red-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-5" /></Button>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#d4c09e]">Floor Tile · 60×60cm</p>
                <h2 className="mt-1 text-lg font-bold text-ink">Calacatta Gold Polished</h2>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-lg bg-muted-background px-4 py-3"><strong>Size:</strong> 60×120cm</span>
                  <span className="rounded-lg bg-muted-background px-4 py-3"><strong>Finish:</strong> Polished</span>
                </div>
                <div className="mt-3 flex flex-col w-full items-start justify-end gap-4 text-sm font-semibold">
                  <div className="flex items-center rounded-lg border border-slate-200 p-0">
                    <Button type="button" variant="ghost" size="icon" aria-label="Decrease quantity" onClick={() => updateQuantity(item.id, -1)} className="size-11 rounded-none"><Minus className="size-4" /></Button>
                    <span className="min-w-12 text-center">{item.quantity}</span>
                    <Button type="button" variant="ghost" size="icon" aria-label="Increase quantity" onClick={() => updateQuantity(item.id, 1)} className="size-11 rounded-none"><Plus className="size-4" /></Button>
                    <span className="px-3">sqm</span>
                  </div>
                  <p className="text-right text-sm font-normal text-ink items-right"><strong>{formatPrice(item.unitPrice)}</strong> /sqm</p>
                </div>
                <p className="mt-auto pt-6 text-2xl font-bold text-ink">{formatPrice(item.quantity * item.unitPrice)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="h-fit bg-white p-6 sm:p-8 xl:sticky xl:top-28">
        <h2 className="text-xl font-bold text-ink">ORDER OVERVIEW</h2>
        <div className="mt-7 flex items-center justify-between border-b border-slate-200 pb-5 text-sm"><span>Subtotal ({items.length} items)</span><strong className="text-xl">{formatPrice(subtotal)}</strong></div>
        <div className="flex items-center justify-between py-5"><strong>Total Cost</strong><strong className="text-2xl">{formatPrice(subtotal)}</strong></div>
        <Button type="button" className="h-14 w-full justify-between px-5 text-base font-bold">Place Order <ArrowRight className="size-5" /></Button>
        <div className="my-5 flex items-center gap-4 text-sm text-muted"><span className="h-px flex-1 bg-slate-200" />OR<span className="h-px flex-1 bg-slate-200" /></div>
        <Button type="button" variant="secondary" className="h-14 w-full text-base text-muted">Generate Quotation</Button>
      </aside>
    </div>
  );
};

export default CartPage;

"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  CircleAlert,
  PackageCheck,
  Ruler,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { products } from "@/data/catalog";
import { getAvailableStockSqm } from "@/lib/stock-availability";
import {
  DEFAULT_WASTAGE_PERCENT,
  calculateFloorPlan,
  resolveBaseArea,
} from "@/lib/floor-plan";
import { cn } from "@/lib/utils";

const formatRWF = (value: number) => `RWF ${Math.round(value).toLocaleString("en-US")}`;
const formatNumber = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

/**
 * Floor plan calculator (doc 3.8): the client enters room dimensions, we add a
 * wastage allowance, and return the material needed split between what current
 * stock covers and what has to be sourced separately, with an estimated cost.
 */
export default function FloorPlanCalculatorPage() {
  const [lengthM, setLengthM] = useState("6");
  const [widthM, setWidthM] = useState("5");
  const [totalAreaSqm, setTotalAreaSqm] = useState("");
  const [useTotalArea, setUseTotalArea] = useState(false);
  const [wastagePercent, setWastagePercent] = useState(String(DEFAULT_WASTAGE_PERCENT));
  const [productId, setProductId] = useState(products[0].id);

  const product = products.find((item) => item.id === productId) ?? products[0];

  const input = useMemo(
    () => ({
      lengthM: useTotalArea ? undefined : Number(lengthM),
      widthM: useTotalArea ? undefined : Number(widthM),
      totalAreaSqm: useTotalArea ? Number(totalAreaSqm) : undefined,
      wastagePercent: Number(wastagePercent),
    }),
    [lengthM, widthM, totalAreaSqm, useTotalArea, wastagePercent],
  );

  const baseArea = resolveBaseArea(input);

  const result = useMemo(() => {
    const availableSqm = getAvailableStockSqm(product);
    const availablePieces = Number.isFinite(availableSqm)
      ? Math.floor(availableSqm / product.tileArea)
      : Number.MAX_SAFE_INTEGER;

    return calculateFloorPlan(input, {
      tileArea: product.tileArea,
      boxCoverage: product.boxCoverage,
      piecesPerBox: product.piecesPerBox,
      price: product.price,
      availablePieces,
    });
  }, [input, product]);

  const breakdown = [
    { label: "Room area", value: `${formatNumber(result.baseAreaSqm)} m²` },
    { label: `With ${result.wastagePercent}% wastage`, value: `${formatNumber(result.requiredAreaSqm)} m²` },
    { label: "Complete boxes", value: result.completeBoxes.toLocaleString() },
    { label: "Additional pieces", value: result.remainingPieces.toLocaleString() },
    { label: "Total pieces", value: result.totalPieces.toLocaleString() },
    { label: "Material purchased", value: `${formatNumber(result.purchasedAreaSqm)} m²` },
  ];

  return (
    <div className="pb-10">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Floor plan calculator</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          How much material does your room need?
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Enter your room dimensions (or a total area) and we&apos;ll work out the quantity, including a
          wastage allowance, split between what we can ship from current stock and what would need to be
          sourced separately.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr] lg:items-start">
        <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-2">
            <Ruler className="size-5 text-ink" />
            <h2 className="text-lg font-bold text-ink">Your space</h2>
          </div>

          <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-[#F9FAFB] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">I already know the total area</p>
              <p className="mt-0.5 text-xs text-muted">Skip length × width and enter m² directly.</p>
            </div>
            <Switch
              checked={useTotalArea}
              onCheckedChange={setUseTotalArea}
              aria-label="Enter a total area instead of dimensions"
            />
          </div>

          {useTotalArea ? (
            <Field>
              <FieldLabel htmlFor="fp-total-area">Total area (m²)</FieldLabel>
              <Input
                id="fp-total-area"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={totalAreaSqm}
                onChange={(event) => setTotalAreaSqm(event.target.value)}
                placeholder="e.g. 30"
                className="h-12 text-base font-semibold"
              />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="fp-length">Length (m)</FieldLabel>
                <Input
                  id="fp-length"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={lengthM}
                  onChange={(event) => setLengthM(event.target.value)}
                  className="h-12 text-base font-semibold"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="fp-width">Width (m)</FieldLabel>
                <Input
                  id="fp-width"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={widthM}
                  onChange={(event) => setWidthM(event.target.value)}
                  className="h-12 text-base font-semibold"
                />
              </Field>
            </div>
          )}

          <Field className="mt-4">
            <FieldLabel htmlFor="fp-wastage">Wastage allowance (%)</FieldLabel>
            <Input
              id="fp-wastage"
              type="number"
              min="0"
              max="50"
              step="1"
              inputMode="numeric"
              value={wastagePercent}
              onChange={(event) => setWastagePercent(event.target.value)}
              className="h-12 text-base font-semibold"
            />
            <p className="mt-2 text-xs text-muted">
              {DEFAULT_WASTAGE_PERCENT}% is recommended for straight layouts; allow 15% for diagonal or
              herringbone patterns.
            </p>
          </Field>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Choose a tile</p>
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {products.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setProductId(item.id)}
                  aria-pressed={item.id === productId}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                    item.id === productId
                      ? "border-ink bg-secondary"
                      : "border-slate-100 hover:bg-[#F9FAFB]",
                  )}
                >
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                    <Image src={item.image} alt="" fill unoptimized className="object-cover" sizes="48px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {item.size} · {formatRWF(item.price)} per box
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-2">
              <Boxes className="size-5 text-ink" />
              <h2 className="text-lg font-bold text-ink">Material required</h2>
            </div>

            {baseArea <= 0 ? (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                Enter {useTotalArea ? "a total area" : "both a length and a width"} to see the calculation.
              </p>
            ) : (
              <>
                <dl className="space-y-3 text-sm">
                  {breakdown.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="text-muted">{row.label}</dt>
                      <dd className="font-data font-semibold text-ink">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <p className="text-base font-bold text-ink">Estimated material cost</p>
                  <p className="text-xl font-bold text-ink">{formatRWF(result.estimatedCost)}</p>
                </div>
              </>
            )}
          </section>

          {baseArea > 0 && (
            <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-2">
                <PackageCheck className="size-5 text-ink" />
                <h2 className="text-lg font-bold text-ink">Stock split</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-green-700">
                    Available from stock
                  </p>
                  <p className="mt-2 text-2xl font-black text-green-800">
                    {result.fromStockPieces.toLocaleString()}
                    <span className="ml-1 text-sm font-bold">pcs</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-green-700">
                    {formatRWF(result.fromStockCost)}
                  </p>
                </article>

                <article
                  className={cn(
                    "rounded-xl border p-4",
                    result.toSourcePieces > 0
                      ? "border-amber/30 bg-amber-50"
                      : "border-slate-100 bg-[#F9FAFB]",
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wide",
                      result.toSourcePieces > 0 ? "text-amber-800" : "text-muted",
                    )}
                  >
                    To be sourced separately
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-2xl font-black",
                      result.toSourcePieces > 0 ? "text-amber-900" : "text-ink",
                    )}
                  >
                    {result.toSourcePieces.toLocaleString()}
                    <span className="ml-1 text-sm font-bold">pcs</span>
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs font-medium",
                      result.toSourcePieces > 0 ? "text-amber-800" : "text-muted",
                    )}
                  >
                    {formatRWF(result.toSourceCost)}
                  </p>
                </article>
              </div>

              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted">
                <Truck className="mt-0.5 size-3.5 shrink-0" />
                {result.fullyAvailableFromStock
                  ? "Everything you need is on hand — this can be dispatched as soon as the quotation is settled."
                  : "Part of this order would come from the next batch. Our stock team will confirm lead times with you before you pay."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button
                  nativeButton={false}
                  render={<Link href={`/products/${product.id}`} />}
                  variant="outline"
                  className="h-12 w-full font-bold"
                >
                  View this tile
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link href="/account/cart" />}
                  className="group h-12 w-full gap-2 bg-primary font-bold text-ink hover:bg-primary/90"
                >
                  Add to an order
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

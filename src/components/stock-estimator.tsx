"use client";

import { ClipboardClock } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Product } from "@/components/product-card";

export const StockEstimator = ({ product, stockBoxes }: { product: Product; stockBoxes: number }) => {
  const [length, setLength] = useState("12");
  const [width, setWidth] = useState("12");
  const [waste, setWaste] = useState(true);
  const totalArea = Number(length) * Number(width) * (waste ? 1.1 : 1);
  const boxesNeeded = Math.ceil(totalArea / product.boxCoverage);
  const estimatedValue = boxesNeeded * product.boxCoverage * product.price;
  const rows = useMemo(() => [["Total area", `${totalArea.toFixed(2)} m²`], ["Boxes needed", String(boxesNeeded)], ["Available stock", `${stockBoxes.toLocaleString()} boxes`]], [boxesNeeded, stockBoxes, totalArea]);

  return <section className="rounded-2xl border border-[#e1e5ea] bg-card p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><ClipboardClock className="size-5 text-ink" /><h2 className="text-base font-bold tracking-wide text-ink uppercase">Stock Estimator</h2></div><div className="mt-6 grid grid-cols-2 gap-4"><label className="text-xs font-medium uppercase tracking-wide text-[#53604d]">Length (m)<Input type="number" value={length} onChange={(event) => setLength(event.target.value)} className="mt-2 h-12 text-base" /></label><label className="text-xs font-medium uppercase tracking-wide text-[#53604d]">Width (m)<Input type="number" value={width} onChange={(event) => setWidth(event.target.value)} className="mt-2 h-12 text-base" /></label></div><div className="mt-6 flex items-center justify-between border-b border-border pb-5"><div><p className="text-xs uppercase tracking-wide text-[#53604d]">Wastage allowance</p><p className="mt-1 text-sm text-[#53604d]">10% Recommended</p></div><button type="button" role="switch" aria-checked={waste} onClick={() => setWaste((value) => !value)} className={`relative h-6 w-12 rounded-full ${waste ? "bg-ink" : "bg-border"}`}><span className={`absolute top-1 size-4 rounded-full bg-white ${waste ? "left-7" : "left-1"}`} /></button></div><dl className="mt-5 space-y-4 text-sm">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3"><dt className="text-[#53604d]">{label}</dt><dd className="font-data font-semibold text-ink">{value}</dd></div>)}<div className="flex items-center justify-between gap-3 border-t border-border pt-5"><dt className="font-bold text-ink uppercase">Estimated value</dt><dd className="text-xl font-bold text-ink">{estimatedValue.toLocaleString()} RWF</dd></div></dl></section>;
};

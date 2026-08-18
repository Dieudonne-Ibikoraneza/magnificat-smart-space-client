import { BriefcaseBusiness, Layers3, PackagePlus, Tags } from "lucide-react";
import { SalesPageHeader } from "@/components/sales-page-header";

const catalogStats = [
  ["Total Products", "248", BriefcaseBusiness, "Across all categories", "bg-[#F3F4F6]"],
  ["Categories", "18", Layers3, "4 added this month", "bg-[#FAFDE9]"],
  ["Low Stock", "14", Tags, "Requires attention", "bg-[#FEF3C7]"],
] as const;

const products = [
  ["Urban Stone Beige", "Porcelain Tiles", "RWF 28,500 / m²", "In stock", "bg-[#E8E1D5]"],
  ["Marble White Gloss", "Wall Tiles", "RWF 32,000 / m²", "In stock", "bg-[#F2F2EF]"],
  ["Terracotta Clay", "Outdoor Tiles", "RWF 24,800 / m²", "Low stock", "bg-[#C98762]"],
  ["Slate Graphite", "Floor Tiles", "RWF 30,500 / m²", "In stock", "bg-[#6D7375]"],
];

const CatalogPage = () => (
  <>
    <SalesPageHeader title="Catalog" subtitle="Browse and manage the sales catalog." actionLabel="Add Product" actionIcon="packagePlus" />
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">{catalogStats.map(([label, value, Icon, note, iconBackground]) => <article key={label} className="rounded-2xl bg-card p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold tracking-wide text-ink uppercase">{label}</p><span className={`flex size-9 items-center justify-center rounded-full text-ink ${iconBackground}`}><Icon className="size-4" /></span></div><p className="mt-5 text-3xl font-bold text-ink">{value}</p><p className="mt-3 text-sm text-muted-foreground">{note}</p></article>)}</div>
      <section className="rounded-2xl bg-card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-ink">Products</h2><p className="mt-1 text-sm text-muted-foreground">Your most popular catalog items.</p></div><button type="button" className="text-xs font-semibold tracking-wider text-ink">VIEW ALL</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{products.map(([name, category, price, stock, imageBackground]) => <article key={name} className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-card transition-shadow hover:shadow-md"><div className={`flex h-36 items-center justify-center ${imageBackground}`}><PackagePlus className="size-12 text-ink/40" strokeWidth={1.2} /></div><div className="p-4"><p className="truncate text-sm font-bold text-ink">{name}</p><p className="mt-1 text-xs text-muted-foreground">{category}</p><div className="mt-4 flex items-center justify-between gap-2"><span className="font-data text-sm font-semibold text-ink">{price}</span><span className={`text-[11px] font-bold uppercase ${stock === "Low stock" ? "text-[#F4B400]" : "text-primary"}`}>{stock}</span></div></div></article>)}</div></section>
    </div>
  </>
);

export default CatalogPage;

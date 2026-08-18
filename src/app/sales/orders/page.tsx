import { Clock3, ListChecks, ShoppingCart } from "lucide-react";
import { SalesPageHeader } from "@/components/sales-page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const orders = [
  ["ORD-092", "Vision City Villas", "Oct 24, 2026", "RWF 12,400,000", "Processing", "secondary"],
  ["ORD-091", "Norrsken House", "Oct 22, 2026", "RWF 8,250,000", "Shipped", "primary"],
  ["ORD-090", "Kigali Heights Corp.", "Oct 20, 2026", "RWF 45,000,020", "Delivered", "muted"],
  ["ORD-089", "Park Suites", "Oct 18, 2026", "RWF 6,800,000", "Pending", "warning"],
] as const;

const orderStats = [
  ["Total Orders", "128", ShoppingCart, "This year", "bg-[#F3F4F6]"],
  ["Pending Orders", "12", Clock3, "Requires attention", "bg-[#FEF3C7]"],
  ["Completed Orders", "96", ListChecks, "75% completion rate", "bg-[#FAFDE9]"],
] as const;

const OrdersPage = () => (
  <>
    <SalesPageHeader title="Orders" subtitle="Track and manage customer orders." actionLabel="Create Order" actionIcon="userPlus" />
    <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">{orderStats.map(([label, value, Icon, note, iconBackground]) => <article key={label} className="rounded-2xl bg-card p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold tracking-wide text-ink uppercase">{label}</p><span className={`flex size-9 items-center justify-center rounded-full text-ink ${iconBackground}`}><Icon className="size-4" /></span></div><p className="mt-5 text-3xl font-bold text-ink">{value}</p><p className="mt-3 text-sm text-muted-foreground">{note}</p></article>)}</div>
      <section className="overflow-hidden rounded-2xl bg-card">
        <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6"><div><h2 className="text-lg font-bold text-ink">All Orders</h2><p className="mt-1 text-sm text-muted-foreground">Review your latest sales orders.</p></div><button type="button" className="text-xs font-semibold tracking-wider text-ink">FILTER</button></div>
        <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow>{["Order ID", "Customer", "Date", "Amount", "Status"].map((head) => <TableHead key={head}>{head}</TableHead>)}</TableRow></TableHeader><TableBody>{orders.map(([id, customer, date, amount, status, variant]) => <TableRow key={id}><TableCell className="font-semibold text-ink">{id}</TableCell><TableCell className="text-ink">{customer}</TableCell><TableCell className="whitespace-nowrap text-ink">{date}</TableCell><TableCell className="font-semibold whitespace-nowrap text-ink">{amount}</TableCell><TableCell><Badge variant={variant}>{status}</Badge></TableCell></TableRow>)}</TableBody></Table></div>
        <ul className="divide-y divide-[#E5E7EB] md:hidden">{orders.map(([id, customer, date, amount, status, variant]) => <li key={id} className="flex items-start justify-between gap-3 px-5 py-4"><div><p className="text-sm font-semibold text-ink">{id}</p><p className="text-sm text-ink">{customer}</p><p className="mt-1 text-xs text-muted-foreground">{date}</p></div><div className="flex flex-col items-end gap-2"><p className="text-sm font-semibold text-ink">{amount}</p><Badge variant={variant}>{status}</Badge></div></li>)}</ul>
      </section>
    </div>
  </>
);

export default OrdersPage;

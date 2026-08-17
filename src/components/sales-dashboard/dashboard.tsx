"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BarChart3, BriefcaseBusiness, ChevronRight, Clock3, LayoutGrid, LogOut,
  Menu, MoreVertical, ShoppingCart, TrendingUp, User, UserPlus, Users, X,
} from "lucide-react";

const datasets = {
  W: [
    { day: "Mon", value: 2_100_000 }, { day: "Tue", value: 3_400_000 }, { day: "Wed", value: 2_800_000 },
    { day: "Thu", value: 4_600_000 }, { day: "Fri", value: 5_200_000 }, { day: "Sat", value: 3_900_000 }, { day: "Sun", value: 1_800_000 },
  ],
  M: [
    { day: "Oct 01", value: 6_800_000 }, { day: "Oct 05", value: 9_400_000 }, { day: "Oct 10", value: 11_900_000 },
    { day: "Oct 15", value: 11_100_000 }, { day: "Oct 20", value: 12_400_000 }, { day: "Oct 25", value: 12_300_000 },
    { day: "Oct 30", value: 12_350_000 }, { day: "Nov 05", value: 11_000_000 }, { day: "Nov 10", value: 15_200_000 },
    { day: "Nov 15", value: 18_400_000 }, { day: "Nov 20", value: 13_400_000 },
  ],
  Y: [
    { day: "Jan", value: 42_000_000 }, { day: "Feb", value: 51_000_000 }, { day: "Mar", value: 47_500_000 },
    { day: "Apr", value: 62_000_000 }, { day: "May", value: 58_000_000 }, { day: "Jun", value: 71_000_000 },
    { day: "Jul", value: 66_500_000 }, { day: "Aug", value: 78_000_000 }, { day: "Sep", value: 73_000_000 },
    { day: "Oct", value: 88_000_000 }, { day: "Nov", value: 81_000_000 }, { day: "Dec", value: 95_000_000 },
  ],
};

const nav = [
  ["Dashboard", LayoutGrid], ["Customers", Users], ["Orders", ShoppingCart],
  ["Catalog", BriefcaseBusiness], ["Account Settings", BarChart3],
] as const;

const customers = [
  ["KC", "Kigali Heights Corp.", "3 Orders (Jun 20, 2026 - Aug 2, 2026)", "RWF 18.29 M"],
  ["SK", "Simba Kicukiro", "1 Order (Aug 1, 2026)", "RWF 15.69 M"],
  ["PS", "Park Suites", "2 Orders (Jul 1, 2026 - Jul 29, 2026)", "RWF 10.24 M"],
  ["NT", "Nyamata Twyford", "1 Order (Aug 2, 2026)", "RWF 6.50 M"],
];

const orders = [
  ["ORD-092", "Vision City Villas", "Oct 24, 2026", "RWF 12,400,000", "Processing"],
  ["ORD-091", "Norrsken House", "Oct 22, 2026", "RWF 8,250,000", "Shipped"],
  ["ORD-090", "Kigali Heights Corp.", "Oct 20, 2026", "RWF 45,000,020", "Delivered"],
];

function Sidebar({ close }: { close?: () => void }) {
  const [active, setActive] = useState("Dashboard");
  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto px-5 py-6">
      <div>
        <div className="px-2 pb-8"><Image src="/images/logo.png" alt="Magnificat Smart Space" width={240} height={180} className="mx-auto w-40 object-contain" /></div>
        <nav className="space-y-1" aria-label="Sales dashboard navigation">
          {nav.map(([label, Icon]) => <button type="button" key={label} aria-current={label === active ? "page" : undefined} onClick={() => { setActive(label); close?.(); }} className={`group relative flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left text-[15px] transition-all duration-200 ${label === active ? "bg-[#f8fce7] font-semibold text-ink" : "font-medium text-ink/75 hover:translate-x-1 hover:bg-[#fbfdec] hover:text-ink"}`}>
            <span className={`absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-primary ${label === active ? "scale-y-100" : "scale-y-0"}`} /><Icon className="size-5 shrink-0" strokeWidth={1.8} /><span className="truncate">{label}</span>
          </button>)}
        </nav>
      </div>
      <div className="mt-8 flex shrink-0 items-center gap-3 rounded-xl bg-[#f8fce7] px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-card">JD</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">John Doe</p><p className="truncate text-xs text-muted-foreground">john.doe@example.com</p></div>
        <button type="button" aria-label="Sign out" className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"><LogOut className="size-5" strokeWidth={1.8} /></button>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-lg"><p className="font-data text-xs font-semibold tracking-widest text-data-ink">{label}</p><p className="mt-1 font-data text-sm text-ink">Revenue: RWF {payload[0].value.toLocaleString()}</p></div>;
}

function SalesChart() {
  const [range, setRange] = useState<keyof typeof datasets>("M");
  const [hovered, setHovered] = useState<number | null>(null);
  const data = datasets[range];
  return <section className="rounded-2xl bg-card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-ink">Sales Performance</h2><p className="mt-1 text-sm text-muted-foreground">Revenue (RWF) across selected period</p></div><div className="flex gap-2">{(["W", "M", "Y"] as const).map((item) => <button type="button" key={item} onClick={() => setRange(item)} aria-pressed={range === item} className={`size-8 rounded-md text-xs font-semibold transition-all ${range === item ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-card text-ink hover:bg-secondary"}`}>{item}</button>)}</div></div><div className="mt-6 h-[260px] w-full font-data sm:mt-8 sm:h-[320px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barCategoryGap="30%" margin={{ top: 8, right: 4, left: 0, bottom: 24 }} onMouseLeave={() => setHovered(null)}><CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" /><XAxis dataKey="day" angle={-40} textAnchor="end" tickLine={false} axisLine={false} interval="preserveStartEnd" tick={{ fill: "var(--data-ink)", fontSize: 11, fontFamily: "var(--font-data)" }} /><YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value: number) => value === 0 ? "0" : `${value / 1_000_000}M`} tick={{ fill: "var(--data-ink)", fontSize: 11, fontFamily: "var(--font-data)" }} /><Tooltip cursor={{ fill: "transparent" }} content={<ChartTooltip />} /><Bar dataKey="value" barSize="70%" radius={[2, 2, 0, 0]} animationDuration={700} onMouseEnter={(_, index) => setHovered(index)}>{data.map((_, index) => <Cell key={index} fill="var(--chart-blue)" fillOpacity={hovered === null || hovered === index ? 1 : 0.45} />)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-2 flex items-center justify-center gap-2"><span className="size-3 rounded-sm bg-chart-blue" /><span className="font-data text-sm text-data-ink">Sales Performance</span></div></section>;
}

function Kpis() {
  const cards = [["Total Sales (YTD)", "RWF 128,500,00", TrendingUp, "+14%", "vs last month"], ["Active Customers", "42", User, "", "3 new this week"], ["Pending Orders", "12", Clock3, "", "Requires attention"], ["Monthly Sales", "RWF 128,500,00", TrendingUp, "+14%", "vs last month"]] as const;
  return <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">{cards.map(([label, value, Icon, trend, note]) => <article key={label} className="group rounded-2xl bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6"><div className="flex items-start justify-between gap-3"><p className="min-w-0 text-[11px] font-semibold tracking-[0.06em] text-ink uppercase sm:text-xs">{label}</p><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-ink"><Icon className="size-4" strokeWidth={1.8} /></span></div><p className="mt-4 break-words text-2xl font-bold text-ink sm:mt-5 sm:text-3xl">{value}</p><p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground sm:mt-5">{trend && <><TrendingUp className="size-4 text-primary" strokeWidth={2.2} /><span className="font-semibold text-primary">{trend}</span></>}{note}</p></article>)}</div>;
}

export default function SalesDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="min-h-dvh bg-background"><aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-border bg-card lg:block xl:w-[320px]"><Sidebar /></aside>{menuOpen && <><button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden" /><aside className="fixed inset-y-0 left-0 z-50 h-screen w-[280px] max-w-[85vw] bg-card shadow-2xl lg:hidden"><button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="absolute right-3 top-3 z-10 rounded-md p-2 text-ink hover:bg-secondary"><X className="size-5" /></button><Sidebar close={() => setMenuOpen(false)} /></aside></>}<main className="min-h-dvh px-4 py-6 sm:px-6 lg:ml-[280px] lg:px-10 lg:py-8 xl:ml-[320px]"><header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-4"><div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)} className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-ink hover:bg-secondary lg:hidden"><Menu className="size-5" /></button><div className="min-w-0"><h1 className="truncate text-xl font-bold text-ink sm:text-2xl">Overview</h1><p className="mt-1 hidden text-sm text-muted-foreground sm:block">Track your sales performance and daily tasks.</p></div></div><button type="button" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:px-6 sm:py-3.5"><UserPlus className="size-5" strokeWidth={1.9} /><span className="hidden sm:inline">Add New Customer</span><span className="sm:hidden">Add</span></button></header><div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6"><Kpis /><div className="grid gap-5 sm:gap-6 xl:grid-cols-[1.7fr_1fr]"><SalesChart /><section className="flex animate-fade-in flex-col rounded-2xl bg-card p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Top Customers</h2><ul className="mt-4 flex-1 divide-y divide-border">{customers.map(([initials, name, meta, amount]) => <li key={initials} className="group flex items-center gap-3 rounded-lg px-2 py-4 transition-colors hover:bg-secondary/60"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">{initials}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{name}</p><p className="truncate text-xs text-muted-foreground">{meta}</p></div><span className="shrink-0 font-data text-sm font-semibold text-ink">{amount}</span></li>)}</ul><button type="button" className="mt-2 w-full rounded-lg py-3 text-sm font-medium text-ink hover:bg-secondary">View All</button></section></div><section className="animate-fade-in overflow-hidden rounded-2xl bg-card"><div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6"><h2 className="truncate text-lg font-bold text-ink">Recent Orders</h2><button type="button" className="group flex shrink-0 items-center gap-1 text-xs font-semibold tracking-wider text-ink">VIEW ALL <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" /></button></div><div className="hidden overflow-x-auto md:block"><table className="w-full font-data text-sm"><thead><tr className="bg-background/70 text-left text-[11px] font-semibold tracking-[0.08em] text-data-ink uppercase">{["Order ID", "Customer", "Date", "Amount", "Status", "Action"].map((head) => <th key={head} className="px-6 py-4 font-semibold">{head}</th>)}</tr></thead><tbody className="divide-y divide-border">{orders.map(([id, customer, date, amount, status]) => <tr key={id} className="group cursor-pointer transition-colors hover:bg-secondary/50"><td className="px-6 py-5 font-semibold text-ink">{id}</td><td className="px-6 py-5 text-ink">{customer}</td><td className="px-6 py-5 whitespace-nowrap text-ink">{date}</td><td className="px-6 py-5 font-semibold whitespace-nowrap text-ink">{amount}</td><td className="px-6 py-5"><span className={`inline-flex rounded-md px-3 py-1 text-[11px] font-bold tracking-wider uppercase ${status === "Processing" ? "bg-primary text-primary-foreground" : status === "Shipped" ? "bg-chart-blue-soft text-ink" : "bg-muted text-ink"}`}>{status}</span></td><td className="px-6 py-5"><button type="button" aria-label={`Actions for ${id}`} className="rounded-md p-1.5 text-ink hover:bg-secondary"><MoreVertical className="size-4" /></button></td></tr>)}</tbody></table></div><ul className="divide-y divide-border md:hidden">{orders.map(([id, customer, date, amount, status]) => <li key={id} className="flex items-start justify-between gap-3 px-5 py-4 font-data"><div><p className="text-sm font-semibold text-ink">{id}</p><p className="text-sm text-ink">{customer}</p><p className="mt-1 text-xs text-muted-foreground">{date}</p></div><div className="flex flex-col items-end gap-2"><p className="text-sm font-semibold text-ink">{amount}</p><span className="rounded-md bg-primary px-3 py-1 text-[11px] font-bold uppercase">{status}</span></div></li>)}</ul></section></div></main></div>;
}

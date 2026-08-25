"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  Boxes,
  Calculator,
  CheckCircle2,
  Clock3,
  Eye,
  ExternalLink,
  Filter,
  LayoutGrid,
  Palette,
  RefreshCw,
  Ruler,
  Save,
  Share2,
  ShoppingCart,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { AdminPageHeader } from "@/app/admin/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { salesCustomers } from "@/data/sales-customers";
import { inventoryProducts } from "@/data/inventory";

type JourneyStep = {
  title: string;
  count: number;
};

const journeySteps: JourneyStep[] = [
  { title: "System Open", count: 5_240 },
  { title: "Account Registration / Login", count: 4_892 },
  { title: "Product Catalog Browsing", count: 4_520 },
  { title: "Product Detail Views", count: 3_812 },
  { title: "Calculator Usage", count: 2_450 },
  { title: "3D Room Visualizer Open", count: 1_945 },
  { title: "Tile Design Applied", count: 1_420 },
  { title: "Designs Saved / Shared", count: 1_105 },
  { title: "Final Orders Placed", count: 842 },
];

type StepStat = { label: string; value: string; icon: typeof Users };

type LedgerRow = {
  slug: string;
  name: string;
  roomType: string;
  tileName: string;
  tileImage: string;
  date: string;
};

type StepDetail = {
  dateLabel: string;
  actionLabel: string;
  stats: StepStat[];
};

const roomTypes = ["Living Room", "Bedroom", "Bathroom", "Kitchen"];

const ledgerCustomers: LedgerRow[] = salesCustomers.slice(0, 3).map((customer, index) => ({
  slug: customer.slug,
  name: customer.name,
  roomType: roomTypes[index % roomTypes.length],
  tileName: inventoryProducts[index].displayName + " " + ["Polished", "Premium", "Honed"][index],
  tileImage: inventoryProducts[index].image,
  date: customer.lastOrder,
}));

const stepDetails: Record<string, StepDetail> = {
  "Account Registration / Login": {
    dateLabel: "Date Registered",
    actionLabel: "View Profile",
    stats: [
      { label: "Total Customers", value: "4,892", icon: Users },
      { label: "New Signups", value: "3,240", icon: UserPlus },
      { label: "Drop-off Rate", value: "6%", icon: RefreshCw },
    ],
  },
  "Product Catalog Browsing": {
    dateLabel: "Date Browsed",
    actionLabel: "View Session",
    stats: [
      { label: "Total Customers", value: "4,520", icon: Users },
      { label: "Avg. Session Time", value: "4m 12s", icon: Clock3 },
      { label: "Products Viewed / Session", value: "6.2", icon: Eye },
      { label: "Bounce Rate", value: "18%", icon: RefreshCw },
    ],
  },
  "Product Detail Views": {
    dateLabel: "Date Viewed",
    actionLabel: "View Product",
    stats: [
      { label: "Total Customers", value: "3,812", icon: Users },
      { label: "Total Products Viewed", value: "8,940", icon: Eye },
      { label: "Avg. Time on Page", value: "2m 40s", icon: Clock3 },
      { label: "Wishlist Rate", value: "22%", icon: Save },
    ],
  },
  "Calculator Usage": {
    dateLabel: "Date Calculated",
    actionLabel: "View Calculation",
    stats: [
      { label: "Total Customers", value: "2,450", icon: Users },
      { label: "Total Calculations", value: "3,180", icon: Calculator },
      { label: "Avg. Room Size", value: "24 sqm", icon: Ruler },
      { label: "Completion Rate", value: "64%", icon: CheckCircle2 },
    ],
  },
  "3D Room Visualizer Open": {
    dateLabel: "Date Opened",
    actionLabel: "View Session",
    stats: [
      { label: "Total Customers", value: "1,945", icon: Users },
      { label: "Total Sessions", value: "2,610", icon: Box },
      { label: "Avg. Session Time", value: "5m 30s", icon: Clock3 },
      { label: "Design Iterations", value: "3.4", icon: RefreshCw },
    ],
  },
  "Tile Design Applied": {
    dateLabel: "Date Applied",
    actionLabel: "View Design",
    stats: [
      { label: "Total Customers", value: "1,420", icon: Users },
      { label: "Total Designs", value: "1,840", icon: LayoutGrid },
      { label: "Avg. Tiles per Design", value: "2.3", icon: Boxes },
      { label: "Completion Rate", value: "73%", icon: CheckCircle2 },
    ],
  },
  "Designs Saved / Shared": {
    dateLabel: "Date Saved",
    actionLabel: "View Design",
    stats: [
      { label: "Total Customers", value: "1,105", icon: Users },
      { label: "Total Designs", value: "842", icon: Palette },
      { label: "Save Rate", value: "62%", icon: Save },
      { label: "Share Rate", value: "25.1%", icon: Share2 },
    ],
  },
  "Final Orders Placed": {
    dateLabel: "Date Ordered",
    actionLabel: "View Order",
    stats: [
      { label: "Total Customers", value: "842", icon: Users },
      { label: "Total Orders", value: "842", icon: ShoppingCart },
      { label: "Avg. Order Value", value: "RWF 84,200", icon: Wallet },
      { label: "Conversion Rate", value: "76%", icon: CheckCircle2 },
    ],
  },
};

const JourneyFunnel = ({
  selectedStep,
  onSelectStep,
}: {
  selectedStep: number;
  onSelectStep: (index: number) => void;
}) => (
  <section>
    <h2 className="text-lg font-bold text-ink">Customer Journey Funnel</h2>
    <div className="scrollbar-hide mt-4 flex gap-6 overflow-x-auto px-2 pb-2">
      {journeySteps.map((step, index) => {
        const isFirst = index === 0;
        const isActive = selectedStep === index;
        const percentOfTotal = Math.round((step.count / journeySteps[0].count) * 100);
        const previousCount = index > 0 ? journeySteps[index - 1].count : null;
        const change =
          previousCount !== null
            ? Math.round(((step.count - previousCount) / previousCount) * 100)
            : null;

        return (
          <div key={step.title} className="relative flex shrink-0">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onSelectStep(index)}
              className={cn(
                "flex h-48 w-[182px] shrink-0 flex-col justify-between rounded-2xl border bg-card p-5 text-left transition-all duration-200",
                isFirst
                  ? "cursor-not-allowed border-border"
                  : isActive
                    ? "cursor-pointer border-primary shadow-sm border-3 bg-primary/5"
                    : "cursor-pointer border-border hover:border-primary/60 hover:-translate-y-0.5 hover:bg-primary/5",
              )}
            >
              <div>
                <div className="flex items-center gap-1">
                  {isActive && (
                    <span className="size-2.5 rounded-full bg-primary" />
                  )}
                  <p className={cn("text-xs font-bold tracking-wide uppercase", isActive ? "text-ink": "text-muted-foreground")}>
                    Step {index + 1}
                  </p>
                </div>
                <p className="mt-1 text-sm font-semibold text-ink tracking-[0.14px]">{step.title}</p>
              </div>
              <div>
                <p className="text-3xl font-black text-ink">
                  {step.count.toLocaleString()}
                </p>
                <div className="mt-1 flex items-center gap-2 justify-between">
                  <p className={cn("text-xs font-medium", isActive ? "text-ink/80" : "text-ink/60")}>
                    {percentOfTotal}% of Total
                  </p>
                  {change !== null && change < 0 && (
                    <span className="rounded-sm bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                      {change}%
                    </span>
                  )}
                </div>
              </div>
            </button>
            {index < journeySteps.length - 1 && (
              <span
                className={cn(
                  "absolute top-1/2 right-0 z-10 inline-flex size-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border  bg-card text-muted-foreground shadow-sm",
                  isActive ? "border-primary": "border-border"
                )}
              >
                <ArrowRight className="size-4" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  </section>
);

const StepDrillDown = ({ step }: { step: JourneyStep }) => {
  const detail = stepDetails[step.title];
  if (!detail) return null;

  return (
    <>
      <section>
        <h2 className="text-lg font-bold text-ink">{step.title} Drill-down</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {detail.stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article key={stat.label} className="rounded-2xl bg-card p-5 sm:p-6">
                <Icon className="size-5 stroke-2 text-ink" />
                <p className="mt-4 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-black text-ink">{stat.value}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Customer Ledger</h2>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink hover:underline"
          >
            <Filter className="size-3.5" /> Filter
          </button>
        </div>
        <div className="mt-5 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Tiles Used</TableHead>
                <TableHead>{detail.dateLabel}</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerCustomers.map((row) => (
                <TableRow key={row.slug}>
                  <TableCell className="min-w-52">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-card">
                        {row.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <span className="truncate text-sm font-semibold text-ink">{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink">{row.roomType}</TableCell>
                  <TableCell className="min-w-56">
                    <div className="flex items-center gap-3">
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted-background">
                        <Image src={row.tileImage} alt={row.tileName} fill unoptimized className="object-cover" sizes="44px" />
                      </div>
                      <span className="text-sm font-semibold tracking-wide text-ink uppercase">{row.tileName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink">{row.date}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${row.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold whitespace-nowrap text-ink hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                    >
                      {detail.actionLabel} <ExternalLink className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
};

const AdminJourneyAnalyticsPage = () => {
  const [selectedStep, setSelectedStep] = useState(1);

  return (
    <>
      <AdminPageHeader
        title="Journey Analytics"
        subtitle="Analyze customer flow and conversion through the journey funnel"
      />
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        <JourneyFunnel selectedStep={selectedStep} onSelectStep={setSelectedStep} />
        <StepDrillDown step={journeySteps[selectedStep]} />
      </div>
    </>
  );
};

export default AdminJourneyAnalyticsPage;

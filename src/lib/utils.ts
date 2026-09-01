import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "IBIKORANEZA Dieudonne" -> "ID" — the two-letter avatar fallback used everywhere a person has no photo. */
export const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/** An ISO timestamp -> "10 min ago" / "3 hrs ago" / "Yesterday" / "3 days ago" — the stock feeds' relative time. */
export const formatRelativeTime = (isoDate: string) => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
};

/** 128_500_000 -> "RWF 128.5M" — the compact currency format used on every KPI card. */
export const formatCompactCurrency = (amount: number, currency = "RWF") => {
  const sign = amount < 0 ? "-" : "";
  const value = Math.abs(amount);
  if (value >= 1_000_000_000) return `${sign}${currency} ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${sign}${currency} ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${sign}${currency} ${(value / 1_000).toFixed(1)}K`;
  return `${sign}${currency} ${value.toLocaleString("en-US")}`;
};

/** 12_400 -> "12.4K" — same compact scaling as `formatCompactCurrency`, for plain counts (views, etc.) with no currency prefix. */
export const formatCompactNumber = (value: number) => {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toLocaleString("en-US")}`;
};

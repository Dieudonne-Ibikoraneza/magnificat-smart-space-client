import type { Metadata } from "next";
import SalesDashboard from "@/components/sales-dashboard/dashboard";

export const metadata: Metadata = {
  title: "Sales Overview | Magnificat Smart Space",
  description: "Track sales performance, active customers, pending orders and recent orders.",
};

export default function SalesPage() {
  return <SalesDashboard />;
}

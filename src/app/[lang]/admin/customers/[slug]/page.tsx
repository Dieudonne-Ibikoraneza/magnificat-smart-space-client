import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSalesCustomer } from "@/data/sales-customers";
import { getSalesOrdersForCustomer } from "@/data/sales-orders";
import CustomerDetailView from "./customer-detail-view";

type CustomerDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export const generateMetadata = async ({
  params,
}: CustomerDetailPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const customer = getSalesCustomer(slug);

  return {
    title: customer
      ? customer.name + " | Customers | Magnificat Smart Space"
      : "Customer | Magnificat Smart Space",
    description: customer
      ? "Profile details, lifetime spend and recent orders for " +
        customer.name +
        "."
      : "Customer details.",
  };
};

const CustomerDetailPage = async ({ params }: CustomerDetailPageProps) => {
  const { slug } = await params;
  const customer = getSalesCustomer(slug);

  if (!customer) notFound();

  const recentOrders = getSalesOrdersForCustomer(customer.slug);

  return <CustomerDetailView customer={customer} recentOrders={recentOrders} />;
};

export default CustomerDetailPage;

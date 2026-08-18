export type SalesCustomerOrder = {
  id: string;
  date: string;
  amount: string;
  status: "Processing" | "Shipped" | "Delivered";
};

export type SalesCustomer = {
  slug: string;
  name: string;
  status: "Active" | "Inactive";
  email: string;
  phone: string;
  lastOrder: string;
  totalSpend: string;
  lifetimeSpend: string;
  customerId: string;
  joined: string;
  contactName: string;
  address: string[];
  orders: SalesCustomerOrder[];
};

const baseOrders: SalesCustomerOrder[] = [
  {
    id: "ORD-092",
    date: "Oct 24, 2026",
    amount: "RWF 12,400,000",
    status: "Processing",
  },
  {
    id: "ORD-091",
    date: "Oct 22, 2026",
    amount: "RWF 8,250,000",
    status: "Shipped",
  },
  {
    id: "ORD-090",
    date: "Oct 20, 2026",
    amount: "RWF 45,000,020",
    status: "Delivered",
  },
];

export const salesCustomers: SalesCustomer[] = [
  {
    slug: "kigali-heights-corp",
    name: "Kigali Heights Corp.",
    status: "Active",
    email: "info@kigaliheights.rw",
    phone: "+250 788 123 456",
    lastOrder: "Jul 29, 2026",
    totalSpend: "RWF 45,000,020",
    lifetimeSpend: "RWF 128.5M",
    customerId: "CUST-8492",
    joined: "Oct 2021",
    contactName: "Jean Paul",
    address: ["Kigali Heights, Office 402", "KG 7 Ave, Kigali, Rwanda"],
    orders: baseOrders,
  },
  {
    slug: "rha",
    name: "RHA",
    status: "Active",
    email: "info@rha.gov.rw",
    phone: "+250 788 123 456",
    lastOrder: "Jul 29, 2026",
    totalSpend: "RWF 45,000,020",
    lifetimeSpend: "RWF 96.2M",
    customerId: "CUST-8493",
    joined: "Mar 2022",
    contactName: "Alice Uwase",
    address: ["RHA Building, Floor 3", "KN 3 Rd, Kigali, Rwanda"],
    orders: baseOrders,
  },
  {
    slug: "rura",
    name: "RURA",
    status: "Active",
    email: "info@rura.gov.rw",
    phone: "+250 788 123 456",
    lastOrder: "Jul 29, 2026",
    totalSpend: "RWF 45,000,020",
    lifetimeSpend: "RWF 74.8M",
    customerId: "CUST-8494",
    joined: "Jan 2023",
    contactName: "Eric Mugisha",
    address: ["RURA HQ, Nyarutarama", "KG 9 Ave, Kigali, Rwanda"],
    orders: baseOrders,
  },
  {
    slug: "simba-kicukiro",
    name: "Simba Kicukiro",
    status: "Active",
    email: "info@simba.rw",
    phone: "+250 788 123 456",
    lastOrder: "Jul 29, 2026",
    totalSpend: "RWF 45,000,020",
    lifetimeSpend: "RWF 52.1M",
    customerId: "CUST-8495",
    joined: "Aug 2022",
    contactName: "Claudine Ingabire",
    address: ["Simba Supermarket, Kicukiro", "KK 15 Rd, Kigali, Rwanda"],
    orders: baseOrders,
  },
  {
    slug: "rica",
    name: "RICA",
    status: "Active",
    email: "info@rica.gov.rw",
    phone: "+250 788 123 456",
    lastOrder: "Jul 29, 2026",
    totalSpend: "RWF 45,000,020",
    lifetimeSpend: "RWF 41.7M",
    customerId: "CUST-8496",
    joined: "Feb 2024",
    contactName: "Patrick Niyonzima",
    address: ["RICA Offices, Kimihurura", "KG 622 St, Kigali, Rwanda"],
    orders: baseOrders,
  },
  {
    slug: "rms",
    name: "RMS",
    status: "Active",
    email: "info@rms.gov.rw",
    phone: "+250 788 123 456",
    lastOrder: "Jul 29, 2026",
    totalSpend: "RWF 45,000,020",
    lifetimeSpend: "RWF 33.4M",
    customerId: "CUST-8497",
    joined: "Jun 2024",
    contactName: "Diane Keza",
    address: ["RMS Center, Remera", "KG 11 Ave, Kigali, Rwanda"],
    orders: baseOrders,
  },
];

export const getSalesCustomer = (slug: string) =>
  salesCustomers.find((customer) => customer.slug === slug);

export const getSalesCustomerOrders = (slug: string) =>
  getSalesCustomer(slug)?.orders ?? [];

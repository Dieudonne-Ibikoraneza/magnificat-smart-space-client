export type AccountOrderStatus = "Processing" | "Shipped" | "Delivered";

export type AccountOrderItem = {
  productId: string;
  name: string;
  image: string;
  quantity: string;
  boxes: number;
  additionalPieces: number;
  pieces: number;
  unitPrice: number;
  total: number;
};

export type AccountOrder = {
  id: string;
  status: AccountOrderStatus;
  products: string[];
  images: string[];
  date: string;
  total: number;
  amountShort: string;
  expectedDelivery: string;
  updatedAgo: string;
  totalVolume: string;
  items: AccountOrderItem[];
};

export const accountOrders: AccountOrder[] = [
  {
    id: "MGN-99201",
    status: "Processing",
    products: ["Calacatta Gold Polished", "Slate Zenith", "Carrara White Polished", "Travertine Beige"],
    images: [
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=240&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=240&q=85",
    ],
    date: "July 28, 2026",
    total: 2248500,
    amountShort: "RWF 2.25M",
    expectedDelivery: "5 days",
    updatedAgo: "2 hours ago",
    totalVolume: "123 SQM Total Volume",
    items: [
      { productId: "1", name: "Calacatta Gold Polished", image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=240&q=85", quantity: "48 sqm", boxes: 28, additionalPieces: 0, pieces: 196, unitPrice: 22000, total: 1056000 },
      { productId: "2", name: "Slate Zenith", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=240&q=85", quantity: "42 sqm", boxes: 24, additionalPieces: 0, pieces: 168, unitPrice: 18500, total: 777000 },
      { productId: "3", name: "Carrara White Polished", image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=240&q=85", quantity: "25 sqm", boxes: 17, additionalPieces: 0, pieces: 255, unitPrice: 16620, total: 415500 },
    ],
  },
  {
    id: "MGN-99202",
    status: "Shipped",
    products: ["Calacatta Gold Polished", "Slate Zenith"],
    images: [
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=240&q=85",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=240&q=85",
    ],
    date: "July 28, 2026",
    total: 2248500,
    amountShort: "RWF 2.25M",
    expectedDelivery: "3 days",
    updatedAgo: "1 day ago",
    totalVolume: "133 SQM Total Volume",
    items: [
      { productId: "5", name: "Calacatta Gold Polished", image: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=240&q=85", quantity: "75 sqm", boxes: 49, additionalPieces: 1, pieces: 834, unitPrice: 12000, total: 900000 },
      { productId: "6", name: "Slate Zenith", image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=240&q=85", quantity: "58 sqm", boxes: 31, additionalPieces: 1, pieces: 373, unitPrice: 23250, total: 1348500 },
    ],
  },
  {
    id: "MGN-99203",
    status: "Delivered",
    products: ["Calacatta Gold Polished", "Carrara White Polished"],
    images: [
      "https://images.unsplash.com/photo-1615529162924-f8605388461d?auto=format&fit=crop&w=240&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=240&q=85&sat=-20",
    ],
    date: "July 28, 2026",
    total: 2248500,
    amountShort: "RWF 2.25M",
    expectedDelivery: "Delivered",
    updatedAgo: "4 days ago",
    totalVolume: "118 SQM Total Volume",
    items: [
      { productId: "7", name: "Calacatta Gold Polished", image: "https://images.unsplash.com/photo-1615529162924-f8605388461d?auto=format&fit=crop&w=240&q=85", quantity: "60 sqm", boxes: 42, additionalPieces: 1, pieces: 169, unitPrice: 17000, total: 1020000 },
      { productId: "8", name: "Carrara White Polished", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=240&q=85&sat=-20", quantity: "58 sqm", boxes: 41, additionalPieces: 1, pieces: 165, unitPrice: 21146.55, total: 1228500 },
    ],
  },
];

export const getAccountOrder = (id: string) =>
  accountOrders.find((order) => order.id.toLowerCase() === id.toLowerCase());

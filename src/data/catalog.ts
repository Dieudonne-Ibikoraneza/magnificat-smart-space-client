import type { Product } from "@/components/product-card";

export const getProductsByCollection = (collectionId: string) =>
  products.filter((product) => product.collectionId === collectionId);

export const products: Product[] = [
  {
    id: "1",
    sku: "SLB-CG-001",
    name: "Calacatta Gold Polished",
    collectionId: "premium-slabs",
    collection: "Floor Tile",
    size: "50×50cm",
    tileArea: 0.25,
    boxCoverage: 1.75,
    piecesPerBox: 7,
    price: 22000,
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=85",
    description:
      "Pre-cut polished granite step tiles with a bullnose edge. Ideal for creating stunning spaces.",
    stockStatus: "in_stock",
    roomTypes: ["Living Room (Saloon)", "Kitchen"],
    suitableFor: "both",
  },
  {
    id: "2",
    sku: "SLB-CG-002",
    name: "Calacatta Gold Polished",
    collectionId: "premium-slabs",
    collection: "Floor Tile",
    size: "50×50cm",
    tileArea: 0.25,
    boxCoverage: 1.75,
    piecesPerBox: 7,
    price: 18500,
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85",
    description:
      "Pre-cut polished granite step tiles with a bullnose edge. Ideal for creating stunning spaces.",
    stockStatus: "low_stock",
    roomTypes: ["Bathroom", "Kitchen"],
    suitableFor: "wall",
  },
  {
    id: "3",
    sku: "SLB-CG-003",
    name: "Calacatta Gold Polished",
    collectionId: "wood-effect",
    collection: "Floor Tile",
    size: "25×40cm",
    tileArea: 0.1,
    boxCoverage: 1.5,
    piecesPerBox: 15,
    price: 15000,
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85",
    description:
      "Pre-cut polished granite step tiles with a bullnose edge. Ideal for creating stunning spaces.",
    stockStatus: "out_of_stock",
    roomTypes: ["Living Room (Saloon)", "Outdoor"],
    suitableFor: "floor",
  },
  {
    id: "4",
    sku: "SLB-CG-004",
    name: "Calacatta Gold Polished",
    collectionId: "wood-effect",
    collection: "Floor Tile",
    size: "25×40cm",
    tileArea: 0.1,
    boxCoverage: 1.5,
    piecesPerBox: 15,
    price: 20000,
    image:
      "https://images.unsplash.com/photo-1615529162924-f8605388461d?auto=format&fit=crop&w=900&q=85",
    description:
      "Pre-cut polished granite step tiles with a bullnose edge. Ideal for creating stunning spaces.",
    stockStatus: "in_stock",
    roomTypes: ["Balcony", "Outdoor"],
    suitableFor: "both",
  },
  {
    id: "5",
    sku: "SLB-CG-005",
    name: "Calacatta Gold Polished",
    collectionId: "large-floor",
    collection: "Floor Tile",
    size: "30×30cm",
    tileArea: 0.09,
    boxCoverage: 1.53,
    piecesPerBox: 17,
    price: 12000,
    image:
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=85",
    description:
      "Pre-cut polished granite step tiles with a bullnose edge. Ideal for creating stunning spaces.",
    stockStatus: "in_stock",
    roomTypes: ["Balcony", "Living Room (Saloon)"],
    suitableFor: "floor",
  },
  {
    id: "6",
    sku: "SLB-CG-006",
    name: "Calacatta Gold Polished",
    collectionId: "standard-floor",
    collection: "Floor Tile",
    size: "40×40cm",
    tileArea: 0.16,
    boxCoverage: 1.92,
    piecesPerBox: 12,
    price: 13500,
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85",
    description:
      "Pre-cut polished granite step tiles with a bullnose edge. Ideal for creating stunning spaces.",
    stockStatus: "low_stock",
    roomTypes: ["Kitchen", "Bathroom"],
    suitableFor: "wall",
  },
  {
    id: "7",
    sku: "SLB-CG-007",
    name: "Calacatta Gold Polished",
    collectionId: "subway-wall",
    collection: "Floor Tile",
    size: "60×60cm",
    tileArea: 0.36,
    boxCoverage: 1.44,
    piecesPerBox: 4,
    price: 17000,
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85",
    description:
      "Pre-cut polished granite step tiles with a bullnose edge. Ideal for creating stunning spaces.",
    stockStatus: "in_stock",
    roomTypes: ["Living Room (Saloon)", "Kitchen"],
    suitableFor: "floor",
  },
  {
    id: "8",
    sku: "SLB-CG-008",
    name: "Calacatta Gold Polished",
    collectionId: "subway-wall",
    collection: "Floor Tile",
    size: "60×60cm",
    tileArea: 0.36,
    boxCoverage: 1.44,
    piecesPerBox: 4,
    price: 16000,
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85",
    description:
      "Pre-cut polished granite step tiles with a bullnose edge. Ideal for creating stunning spaces.",
    stockStatus: "in_stock",
    roomTypes: ["Bathroom", "Balcony"],
    suitableFor: "both",
  },
  {
    id: "9",
    sku: "SLB-CG-009",
    name: "Calacatta Gold Polished",
    collectionId: "mosaics",
    collection: "Floor Tile",
    size: "20×40cm",
    tileArea: 0.08,
    boxCoverage: 1.28,
    piecesPerBox: 16,
    price: 15000,
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85&sat=-20",
    description:
      "Pre-cut polished granite step tiles with a bullnose edge. Ideal for creating stunning spaces.",
    stockStatus: "low_stock",
    roomTypes: ["Kitchen", "Bathroom", "Living Room (Saloon)"],
    suitableFor: "both",
  },
  {
    id: "10",
    sku: "SLB-CG-010",
    name: "Calacatta Gold Polished",
    collectionId: "mosaics",
    collection: "Floor Tile",
    size: "20×40cm",
    tileArea: 0.08,
    boxCoverage: 1.12,
    piecesPerBox: 14,
    price: 14500,
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85",
    description:
      "Pre-cut polished granite step tiles with a bullnose edge. Ideal for creating stunning spaces.",
    stockStatus: "in_stock",
    roomTypes: ["Bathroom", "Kitchen"],
    suitableFor: "wall",
  },
];

export const filterGroups = [
  {
    title: "Room type" as const,
    options: [
      "Living Room (Saloon)",
      "Bathroom",
      "Kitchen",
      "Balcony",
      "Outdoor",
    ],
  },
  {
    title: "Suitable for" as const,
    options: ["Floor", "Wall", "Floor & Wall"],
  },
  {
    title: "Size" as const,
    options: ["50×50cm", "25×40cm", "30×30cm", "40×40cm", "60×60cm", "20×40cm"],
  },
  {
    title: "Availability" as const,
    options: ["In Stock Ready", "Low Stock", "Out of Stock (Pre-order)"],
  },
];

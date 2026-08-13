import type { Product } from "@/components/product-card";

export const getProductsByCollection = (collectionId: string) =>
  products.filter((product) => product.collectionId === collectionId);

export const products: Product[] = [
  {
    id: "1",
    name: "Calacatta Gold Polished",
    collectionId: "premium-slabs",
    collection: "Floor Tile",
    size: "120×60cm",
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
    name: "Calacatta Gold Polished",
    collectionId: "premium-slabs",
    collection: "Floor Tile",
    size: "120×60cm",
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
    name: "Calacatta Gold Polished",
    collectionId: "premium-slabs",
    collection: "Floor Tile",
    size: "120×60cm",
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
    name: "Calacatta Gold Polished",
    collectionId: "premium-slabs",
    collection: "Floor Tile",
    size: "120×60cm",
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
    name: "Calacatta Gold Polished",
    collectionId: "wood-effect",
    collection: "Floor Tile",
    size: "120×30cm",
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
    name: "Calacatta Gold Polished",
    collectionId: "wood-effect",
    collection: "Floor Tile",
    size: "120×30cm",
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
    name: "Calacatta Gold Polished",
    collectionId: "large-floor",
    collection: "Floor Tile",
    size: "80×80cm",
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
    name: "Calacatta Gold Polished",
    collectionId: "large-floor",
    collection: "Floor Tile",
    size: "80×80cm",
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
    name: "Calacatta Gold Polished",
    collectionId: "standard-floor",
    collection: "Floor Tile",
    size: "60×60cm",
    price: 15000,
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85&sat=-20",
    description:
      "Pre-cut polished granite step tiles with a bullnose edge. Ideal for creating stunning spaces.",
    stockStatus: "low_stock",
    roomTypes: ["Kitchen", "Bathroom", "Living Room (Saloon)"],
    suitableFor: "both",
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
    options: ["60×60cm", "30×60cm", "120×60cm", "120×30cm", "80×80cm"],
  },
  {
    title: "Availability" as const,
    options: ["In Stock Ready", "Low Stock", "Out of Stock (Pre-order)"],
  },
];

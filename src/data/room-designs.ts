import { products } from "@/data/catalog";

/** The 3D rooms a customer can design in (doc 3.5). Mirrors the backend `Room` model. */
export type RoomTypeLabel =
  | "Living Room (Saloon)"
  | "Bedroom"
  | "Bathroom"
  | "Kitchen"
  | "Balcony"
  | "Stairs"
  | "Gates"
  | "Outdoor";

export type VisualizerRoom = {
  id: string;
  type: RoomTypeLabel;
  name: string;
  description: string;
  thumbnail: string;
  /** Path to the 3D model the visualizer loads. */
  modelUrl: string;
  isActive: boolean;
};

export const visualizerRooms: VisualizerRoom[] = [
  {
    id: "room-living",
    type: "Living Room (Saloon)",
    name: "Open-plan living room",
    description: "Double-height saloon with a feature wall and a 6×5m floor.",
    thumbnail: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80",
    modelUrl: "/models/rooms/living_room.glb",
    isActive: true,
  },
  {
    id: "room-bathroom",
    type: "Bathroom",
    name: "Family bathroom",
    description: "Wet room with a walk-in shower, floor and full-height wall surfaces.",
    thumbnail: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=600&q=80",
    modelUrl: "/models/rooms/bathroom.glb",
    isActive: true,
  },
  {
    id: "room-kitchen",
    type: "Kitchen",
    name: "Kitchen with island",
    description: "Galley kitchen with a backsplash run and a durable floor.",
    thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
    modelUrl: "/models/rooms/kitchen.glb",
    isActive: true,
  },
  {
    id: "room-bedroom",
    type: "Bedroom",
    name: "Master bedroom",
    description: "Quiet room with a warm floor finish and an accent wall.",
    thumbnail: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=600&q=80",
    modelUrl: "/models/rooms/bedroom.glb",
    isActive: true,
  },
  {
    id: "room-balcony",
    type: "Balcony",
    name: "Balcony terrace",
    description: "Exterior surface — needs anti-slip, weather-resistant tiles.",
    thumbnail: "https://images.unsplash.com/photo-1615529162924-f8605388461d?auto=format&fit=crop&w=600&q=80",
    modelUrl: "/models/rooms/balcony.glb",
    isActive: true,
  },
  {
    id: "room-stairs",
    type: "Stairs",
    name: "Interior staircase",
    description: "Tread and riser surfaces for a two-flight staircase.",
    thumbnail: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80",
    modelUrl: "/models/rooms/stairs.glb",
    isActive: false,
  },
];

export const getVisualizerRoom = (id: string) =>
  visualizerRooms.find((room) => room.id === id);

/** A design a customer saved to their account, optionally shared with the sales team. */
export type SavedDesignTile = {
  surface: "Floor" | "Walls";
  productId: string;
};

export type SavedDesign = {
  id: string;
  name: string;
  roomId: string;
  roomName: string;
  previewImage: string;
  savedAt: string;
  sharedWithSales: boolean;
  areaSqm: number;
  tiles: SavedDesignTile[];
  /** Set on designs the sales team sees — who saved it. */
  customerName?: string;
  customerSlug?: string;
};

export const savedDesigns: SavedDesign[] = [
  {
    id: "DSG-2041",
    name: "Kacyiru living room — warm marble",
    roomId: "room-living",
    roomName: "Living Room (Saloon)",
    previewImage: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=85",
    savedAt: "2 days ago",
    sharedWithSales: true,
    areaSqm: 48,
    tiles: [
      { surface: "Floor", productId: "1" },
      { surface: "Walls", productId: "2" },
    ],
    customerName: "Kigali Heights Corp.",
    customerSlug: "kigali-heights-corp",
  },
  {
    id: "DSG-2038",
    name: "Guest bathroom — mosaic floor",
    roomId: "room-bathroom",
    roomName: "Bathroom",
    previewImage: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85",
    savedAt: "5 days ago",
    sharedWithSales: false,
    areaSqm: 12,
    tiles: [
      { surface: "Floor", productId: "9" },
      { surface: "Walls", productId: "6" },
    ],
    customerName: "RHA",
    customerSlug: "rha",
  },
  {
    id: "DSG-2033",
    name: "Kitchen backsplash study",
    roomId: "room-kitchen",
    roomName: "Kitchen",
    previewImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85",
    savedAt: "1 week ago",
    sharedWithSales: true,
    areaSqm: 18,
    tiles: [
      { surface: "Floor", productId: "5" },
      { surface: "Walls", productId: "10" },
    ],
    customerName: "Simba Kicukiro",
    customerSlug: "simba-kicukiro",
  },
  {
    id: "DSG-2027",
    name: "Balcony terrace — anti-slip",
    roomId: "room-balcony",
    roomName: "Balcony",
    previewImage: "https://images.unsplash.com/photo-1615529162924-f8605388461d?auto=format&fit=crop&w=900&q=85",
    savedAt: "2 weeks ago",
    sharedWithSales: false,
    areaSqm: 22,
    tiles: [{ surface: "Floor", productId: "4" }],
    customerName: "RURA",
    customerSlug: "rura",
  },
];

export const getSavedDesign = (id: string) =>
  savedDesigns.find((design) => design.id.toLowerCase() === id.toLowerCase());

export const getDesignProducts = (design: SavedDesign) =>
  design.tiles
    .map((tile) => {
      const product = products.find((candidate) => candidate.id === tile.productId);
      return product ? { ...tile, product } : null;
    })
    .filter((entry): entry is SavedDesignTile & { product: (typeof products)[number] } => entry !== null);

/** Designs the customer chose to share are the ones the sales team reviews. */
export const sharedDesigns = savedDesigns.filter((design) => design.sharedWithSales);

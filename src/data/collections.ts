export type Collection = {
  id: string;
  title: string;
  description: string;
  image: string;
};

export const getCollectionById = (id: string) =>
  collections.find((collection) => collection.id === id);

export const collections: Collection[] = [
  {
    id: "premium-slabs",
    title: "50×50cm Floor Tiles",
    description: "Balanced square tiles for polished, luxurious floors and walls.",
    image: "/tile-marble.jpg",
  },
  {
    id: "wood-effect",
    title: "25×40cm Wall Tiles",
    description: "Versatile rectangular tiles for bathrooms, kitchens, and feature walls.",
    image: "/tile-wood.jpg",
  },
  {
    id: "large-floor",
    title: "30×30cm Mosaic Tiles",
    description: "Intricate, detailed tiles for high-grip shower floors and decorative focal points.",
    image: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "standard-floor",
    title: "40×40cm Standard Tiles",
    description: "Classic square tiles suitable for bathrooms, kitchens, living rooms, and floors.",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "subway-wall",
    title: "60×60cm Large Format",
    description: "Expansive square tiles designed to minimize grout lines in modern spaces.",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "mosaics",
    title: "20×40cm Wall Tiles",
    description: "Elegant rectangular tiles for striking bathroom walls and kitchen backsplashes.",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=85",
  },
];

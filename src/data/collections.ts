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
    title: "120×60cm Premium Slabs",
    description: "Grand format tiles for seamless, luxurious open spaces. Ideal for statement walls and grand living rooms.",
    image: "/tile-marble.jpg",
  },
  {
    id: "wood-effect",
    title: "120×30cm Wood Effect",
    description: "The warmth of natural wood combined with the extreme durability of porcelain. Perfect for balconies and busy floors.",
    image: "/tile-wood.jpg",
  },
  {
    id: "large-floor",
    title: "80×80cm Large Floor",
    description: "Expansive square tiles designed to minimize grout lines and create modern, unified spaces.",
    image: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "standard-floor",
    title: "60×60cm Standard Format",
    description: "The classic, versatile dimension suitable for almost any application, from bathrooms to kitchens.",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "subway-wall",
    title: "30×60cm Subway & Wall",
    description: "Elegant rectangular tiles designed for striking bathroom walls and kitchen backsplashes.",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "mosaics",
    title: "30×30cm Mosaics",
    description: "Intricate, detailed mosaic patterns for high-grip shower floors and decorative focal points.",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=85",
  },
];

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
    description: "Grand format tiles for seamless, luxurious open spaces. Ideal for statement walls and expansive floors, this collection delivers timeless elegance, refined textures, and a sophisticated finish for modern interiors.",
    image: "/tile-marble.jpg",
  },
  {
    id: "wood-effect",
    title: "25×40cm Wall Tiles",
    description: "Versatile rectangular tiles designed for bathrooms, kitchens, and feature walls. Their warm wood-inspired finish brings natural character, lasting comfort, and an inviting contemporary feel to every interior.",
    image: "/tile-wood.jpg",
  },
  {
    id: "large-floor",
    title: "30×30cm Mosaic Tiles",
    description: "Intricate mosaic tiles created for high-grip shower floors, decorative borders, and expressive focal points. Detailed patterns and durable surfaces make this collection both practical and visually distinctive.",
    image: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "standard-floor",
    title: "40×40cm Standard Tiles",
    description: "Classic square tiles for bathrooms, kitchens, living rooms, and floors. Balanced proportions, dependable performance, and timeless styling make this collection an effortless choice for everyday spaces.",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "subway-wall",
    title: "60×60cm Large Format",
    description: "Expansive square tiles designed to minimize grout lines and create a calm, continuous surface. Their clean format and refined finish are ideal for modern interiors, open-plan floors, and statement walls.",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "mosaics",
    title: "20×40cm Wall Tiles",
    description: "Elegant rectangular tiles for striking bathroom walls and kitchen backsplashes. The collection combines refined proportions, expressive surface detail, and dependable durability for polished contemporary spaces.",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=85",
  },
];

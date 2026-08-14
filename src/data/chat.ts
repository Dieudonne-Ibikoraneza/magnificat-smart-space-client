export type ChatProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  link: string;
};

export type FollowUp = {
  id: string;
  text: string;
  response: string;
  products: ChatProduct[];
};

export const roomOptions = ["Living Room", "Bathroom", "Bedroom", "Kitchen", "Balcony"];

export const recommendedProducts: ChatProduct[] = [
  { id: "4", name: "Calacatta Gold Polished", image: "https://images.unsplash.com/photo-1615529162924-f8605388461d?auto=format&fit=crop&w=700&q=85", price: 15000, link: "/products/4" },
  { id: "6", name: "Calacatta Gold Polished", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=85", price: 15000, link: "/products/6" },
  { id: "9", name: "Calacatta Gold Polished", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=700&q=85", price: 15000, link: "/products/9" },
];

export const followUps: FollowUp[] = [
  {
    id: "living-room",
    text: "I need premium large-format slabs for a grand living room.",
    response: "For a grand living room, premium large-format slabs create a continuous look with minimal grout lines. These are my top recommendations:",
    products: recommendedProducts,
  },
  {
    id: "balcony",
    text: "Do you have anything suitable for outdoor balconies?",
    response: "Yes. Choose tiles with anti-slip properties and weather resistance for an outdoor balcony. These heavy-duty options are designed for exterior use:",
    products: recommendedProducts,
  },
  {
    id: "kitchen",
    text: "What tiles are best for a modern kitchen?",
    response: "For a modern kitchen, polished wall tiles and durable porcelain floors give you a clean look with easy maintenance. Here are three excellent options:",
    products: recommendedProducts,
  },
  {
    id: "durable",
    text: "Show me the most durable floor tiles.",
    response: "For high-traffic areas, porcelain tiles offer excellent scratch resistance and long-term durability. Here are my strongest floor recommendations:",
    products: recommendedProducts,
  },
];


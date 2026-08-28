/**
 * The chatbot knowledge base the admin panel maintains (doc 3.10: "Content
 * management for the 3D Rooms, tile catalog, and chatbot knowledge base").
 * Each entry is a question the assistant can answer verbatim, in either
 * platform language.
 */
export type KnowledgeBaseLanguage = "EN" | "RW";

export type KnowledgeBaseEntry = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  language: KnowledgeBaseLanguage;
  isActive: boolean;
  updatedAt: string;
};

export const knowledgeBaseEntries: KnowledgeBaseEntry[] = [
  {
    id: "kb-1",
    question: "What tile size is best for a small bathroom?",
    answer:
      "For small bathrooms, larger format tiles (40×40cm or bigger) with minimal grout lines make the space feel bigger. Pair with a light, polished finish.",
    tags: ["bathroom", "size"],
    language: "EN",
    isActive: true,
    updatedAt: "Aug 12, 2026",
  },
  {
    id: "kb-2",
    question: "Which tiles are safe for an outdoor balcony?",
    answer:
      "Choose anti-slip (R10 or higher) porcelain rated for exterior use. Avoid polished finishes outdoors — they become slippery when wet.",
    tags: ["balcony", "outdoor", "safety"],
    language: "EN",
    isActive: true,
    updatedAt: "Aug 12, 2026",
  },
  {
    id: "kb-3",
    question: "How much wastage should I allow when ordering?",
    answer:
      "Allow 10% on straight layouts and 15% on diagonal or herringbone patterns. Our floor plan calculator adds the allowance for you.",
    tags: ["calculator", "wastage", "ordering"],
    language: "EN",
    isActive: true,
    updatedAt: "Aug 09, 2026",
  },
  {
    id: "kb-4",
    question: "Ni ubuhe bunini bw'amakaro bukwiye ubwiherero buto?",
    answer:
      "Ku bwiherero buto, amakaro manini (40×40cm cyangwa arenga) afite imirongo mike y'isima atuma ahantu hagaragara hanini. Hitamo ibara ryerurutse.",
    tags: ["ubwiherero", "ubunini"],
    language: "RW",
    isActive: true,
    updatedAt: "Aug 12, 2026",
  },
  {
    id: "kb-5",
    question: "Do you deliver outside Kigali?",
    answer:
      "Yes. Transport is quoted per order based on quantity and distance, and appears on your quotation before you pay.",
    tags: ["delivery", "transport"],
    language: "EN",
    isActive: true,
    updatedAt: "Aug 05, 2026",
  },
  {
    id: "kb-6",
    question: "Can I return tiles I did not use?",
    answer:
      "Unopened boxes can be returned within 14 days of delivery. Cut or opened boxes cannot be returned.",
    tags: ["returns", "policy"],
    language: "EN",
    isActive: false,
    updatedAt: "Jul 28, 2026",
  },
];

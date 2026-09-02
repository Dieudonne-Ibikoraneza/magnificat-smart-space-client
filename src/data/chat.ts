export const roomOptions = ["Living Room", "Bathroom", "Bedroom", "Kitchen", "Balcony"];

/** Suggested prompts shown once the assistant has made its first recommendation — each just sends its `text` as a real chat message. */
export type FollowUp = { id: string; text: string };

export const followUps: FollowUp[] = [
  { id: "living-room", text: "I need premium large-format slabs for a grand living room." },
  { id: "balcony", text: "Do you have anything suitable for outdoor balconies?" },
  { id: "kitchen", text: "What tiles are best for a modern kitchen?" },
  { id: "durable", text: "Show me the most durable floor tiles." },
];

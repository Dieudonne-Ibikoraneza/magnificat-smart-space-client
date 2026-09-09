export const roomOptions = ["Living Room", "Bathroom", "Bedroom", "Kitchen"];

/**
 * Suggested prompts shown once the assistant has made its first recommendation
 * — each sends its resolved `textKey` (see `chatbot.followUps.*`) as a real
 * chat message.
 */
export type FollowUp = {
  id: string;
  textKey:
    | "chatbot.followUps.livingRoom"
    | "chatbot.followUps.bathroom"
    | "chatbot.followUps.kitchen"
    | "chatbot.followUps.durable";
};

export const followUps: FollowUp[] = [
  { id: "living-room", textKey: "chatbot.followUps.livingRoom" },
  { id: "bathroom", textKey: "chatbot.followUps.bathroom" },
  { id: "kitchen", textKey: "chatbot.followUps.kitchen" },
  { id: "durable", textKey: "chatbot.followUps.durable" },
];

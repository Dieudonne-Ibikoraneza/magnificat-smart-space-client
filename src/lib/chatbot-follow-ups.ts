/** Static prompt shortcuts are UI configuration, not fallback conversation data. */
export type ChatbotFollowUp = {
  id: string;
  textKey:
    | "chatbot.followUps.livingRoom"
    | "chatbot.followUps.bathroom"
    | "chatbot.followUps.kitchen"
    | "chatbot.followUps.durable";
};

export const chatbotFollowUps: ChatbotFollowUp[] = [
  { id: "living-room", textKey: "chatbot.followUps.livingRoom" },
  { id: "bathroom", textKey: "chatbot.followUps.bathroom" },
  { id: "kitchen", textKey: "chatbot.followUps.kitchen" },
  { id: "durable", textKey: "chatbot.followUps.durable" },
];

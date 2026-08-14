"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, CornerDownRight, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatProductCard } from "@/components/chat-product-card";
import { followUps, recommendedProducts, roomOptions, type ChatProduct } from "@/data/chat";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  sender: "bot" | "user";
  text: string;
  products?: ChatProduct[];
  isNew?: boolean;
};

type ConversationStep = "room" | "size" | "wall" | "furniture" | "complete";

const botPrompts = {
  size: "What is the room size / area to cover? (please enter in m², or tell me length × width)",
  wall: "What color is your wall paint? (e.g., white, cream, light gray, beige, blue, etc.)",
  furniture: "What is your preferred furniture color? (e.g., brown/wood, black, white, beige, gray)",
};

const initialMessages: ChatMessage[] = [
  { id: "welcome", sender: "bot", text: "Welcome to Magnificat Smart Space! I am your AI Design Assistant. Let's narrow down your requirements. To give you the best recommendations, tell me: what room are you building/tiling?" },
];

const makeId = () => `${Date.now()}-${Math.random()}`;
const MAX_MESSAGE_LENGTH = 2000;
const MESSAGE_COUNT_THRESHOLD = 1000;

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [step, setStep] = useState<ConversationStep>("room");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const scrollArea = scrollRef.current;
    if (!scrollArea) return;

    const frame = window.requestAnimationFrame(() => {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, isTyping]);

  useEffect(() => {
    const scrollArea = scrollRef.current;
    if (!scrollArea) return;

    const updateScrollButton = () => {
      const distanceFromBottom =
        scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight;
      setShowScrollButton(distanceFromBottom > 240);
    };

    updateScrollButton();
    scrollArea.addEventListener("scroll", updateScrollButton, { passive: true });
    window.addEventListener("resize", updateScrollButton);

    return () => {
      scrollArea.removeEventListener("scroll", updateScrollButton);
      window.removeEventListener("resize", updateScrollButton);
    };
  }, [messages]);

  const scrollToBottom = () => {
    const scrollArea = scrollRef.current;
    if (!scrollArea) return;
    scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: "smooth" });
  };

  const addBotReply = (text: string, products?: ChatProduct[]) => {
    setIsTyping(true);
    window.setTimeout(() => {
      setMessages((current) => [...current, { id: makeId(), sender: "bot", text, products, isNew: true }]);
      setIsTyping(false);
    }, 650);
  };

  const chooseRoom = (room: string) => {
    if (step !== "room" || isTyping) return;
    setMessages((current) => [...current, { id: makeId(), sender: "user", text: room, isNew: true }]);
    setStep("size");
    addBotReply(botPrompts.size);
  };

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const answer = input.trim();
    if (!answer || answer.length > MAX_MESSAGE_LENGTH || isTyping || step === "room") return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
      textareaRef.current.style.overflowY = "hidden";
    }
    setMessages((current) => [...current, { id: makeId(), sender: "user", text: answer, isNew: true }]);
    if (step === "size") {
      setStep("wall");
      addBotReply(botPrompts.wall);
    } else if (step === "wall") {
      setStep("furniture");
      addBotReply(botPrompts.furniture);
    } else if (step === "furniture") {
      setStep("complete");
      addBotReply("Yes! You need tiles with anti-slip properties and weather resistance. I suggest our Heavy-duty wood effect slabs engineered specifically for exterior use.", recommendedProducts);
    } else {
      addBotReply("Thanks for the additional detail. I can use that to refine your tile recommendations. You can also choose one of the follow-up questions below.");
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "56px";
    const maxHeight = 140;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  const selectFollowUp = (followUpId: string) => {
    if (isTyping) return;
    const followUp = followUps.find((item) => item.id === followUpId);
    if (!followUp) return;
    setMessages((current) => [...current, { id: makeId(), sender: "user", text: followUp.text, isNew: true }]);
    addBotReply(followUp.response, followUp.products);
  };

  const showFollowUps = messages.some((message) => message.products?.length);
  const showCharacterCount = input.length > MESSAGE_COUNT_THRESHOLD;

  return (
    <div className="mx-auto grid h-full min-h-0 w-full max-w-3xl grid-rows-[minmax(0,1fr)_auto] overflow-hidden px-4 sm:px-0">
      <div className="relative min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="scrollbar-hide h-full overflow-x-hidden overflow-y-auto overscroll-y-contain px-1 sm:px-2"
        >
          <section className="px-1 pb-4 pt-2 sm:px-0" aria-label="Assistant introduction">
            <h1 className="text-xl font-bold text-ink sm:text-2xl">AI Design Assistant</h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">Select questions below to get personalized recommendations.</p>
          </section>

          <section className="space-y-7" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "items-start"} ${message.isNew ? `chat-message-enter-${message.sender}` : ""}`}
              >
                {message.sender === "bot" && (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white text-amber shadow-sm">
                    <Bot className="size-4" />
                  </span>
                )}
                <div
                  className={`max-w-[calc(100%-3rem)] ${message.sender === "user" ? "flex flex-row-reverse items-center gap-3" : "w-full"}`}
                >
                  <div
                    className={`whitespace-pre-wrap rounded-xl px-5 py-3 text-xs leading-relaxed sm:text-sm ${message.sender === "user" ? "rounded-tr-sm bg-ink text-white" : "bg-white text-slate-700 shadow-sm"}`}
                  >
                    {message.text}
                  </div>
                  {message.sender === "user" && (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                      <UserRound className="size-4" />
                    </span>
                  )}
                  {message.products && (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {message.products.map((product) => (
                        <ChatProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {step === "room" && !isTyping && (
              <div className="ml-12 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
                {roomOptions.map((room) => (
                  <Button
                    key={room}
                    type="button"
                    variant="outline"
                    onClick={() => chooseRoom(room)}
                    className="h-11 px-3 text-xs font-medium text-ink transition-colors hover:bg-primary hover:text-ink sm:text-sm"
                  >
                    {room}
                  </Button>
                ))}
              </div>
            )}

            {isTyping && (
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white text-amber shadow-sm">
                  <Bot className="size-4" />
                </span>
                <div className="flex items-center gap-1 px-2 py-3" aria-label="Assistant is typing">
                  <span className="size-1.5 animate-bounce rounded-full bg-slate-300" />
                  <span className="size-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
                </div>
              </div>
            )}

          </section>

          {showFollowUps && (
            <section className="mt-8 border-t border-slate-200/70 pt-8">
              <h2 className="text-base font-bold text-ink">Follow-ups</h2>
              <div className="mt-3 divide-y divide-slate-200/70">
                {followUps.map((followUp) => (
                  <Button
                    key={followUp.id}
                    type="button"
                    variant="ghost"
                    disabled={isTyping}
                    onClick={() => selectFollowUp(followUp.id)}
                    className="h-auto min-h-10 w-full justify-start gap-3 rounded-none px-2 py-2.5 text-left text-xs font-medium text-muted hover:text-ink sm:text-sm"
                  >
                    <CornerDownRight className="size-4 shrink-0 text-slate-400" />
                    {followUp.text}
                  </Button>
                ))}
              </div>
            </section>
          )}

          <div ref={endRef} className="h-4 shrink-0" aria-hidden="true" />
        </div>

        {showScrollButton && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={scrollToBottom}
            aria-label="Scroll to latest message"
            className="absolute bottom-3 left-1/2 z-10 size-10 -translate-x-1/2 rounded-full border-slate-200 bg-white shadow-md hover:bg-primary"
          >
            <ChevronDown className="size-4" />
          </Button>
        )}
      </div>

      <form
        onSubmit={submitAnswer}
        className="z-10 shrink-0 bg-background px-1 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-2"
      >
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => handleInputChange(event.target.value)}
            onKeyDown={handleInputKeyDown}
            disabled={step === "room" || isTyping}
            rows={1}
            placeholder="Type your message here..."
            className="h-14 min-h-14 max-h-35 overflow-y-hidden rounded-xl bg-white px-3 py-3.5 pr-16 text-sm leading-normal"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={!input.trim() || input.length > MAX_MESSAGE_LENGTH || step === "room" || isTyping}
            className="absolute bottom-3 right-3 top-auto size-9 rounded-full bg-slate-200 text-ink hover:bg-primary"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <div
          className={cn(
            "items-center justify-between px-1 text-[11px] text-muted",
            showCharacterCount ? "mt-2 flex" : "hidden sm:mt-2 sm:flex",
          )}
        >
          <p className={showCharacterCount ? "hidden sm:flex" : ""}>
            Press Enter to submit · Shift + Enter for a new line
          </p>
          {showCharacterCount && (
            <p className={input.length > MAX_MESSAGE_LENGTH ? "font-semibold text-red-500" : ""}>
              {input.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()} characters
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

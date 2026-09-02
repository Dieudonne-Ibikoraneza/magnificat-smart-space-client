"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  CornerDownRight,
  ImagePlus,
  Paperclip,
  Send,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ChatProductCard } from "@/components/chat-product-card";
import { followUps, roomOptions } from "@/data/chat";
import { chatbotApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { getSessionId } from "@/lib/session-id";
import type { ChatRecommendation } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * A photo or video of the customer's own room, attached to a message. The
 * doc (3.6) asks the assistant to generate a styled preview from this, but
 * that model isn't wired up in this environment yet (no real image/video
 * provider, and no public upload endpoint to even get the file a URL) — see
 * `sendAttachment` below, which is honest about that instead of faking it.
 */
type ChatAttachment = {
  kind: "image" | "video";
  name: string;
  /** Object URL for the local preview; revoked when the page unmounts. */
  url: string;
};

type ChatMessage = {
  id: string;
  sender: "bot" | "user";
  text: string;
  products?: ChatRecommendation[];
  attachment?: ChatAttachment;
  isNew?: boolean;
};

const MAX_ATTACHMENT_MB = 25;

const initialMessages: ChatMessage[] = [
  { id: "welcome", sender: "bot", text: "Welcome to Magnificat Smart Space! I am your AI Design Assistant. Let's narrow down your requirements. To give you the best recommendations, tell me: what room are you building/tiling?" },
];

const makeId = () => `${Date.now()}-${Math.random()}`;
const MAX_MESSAGE_LENGTH = 2000;
const MESSAGE_COUNT_THRESHOLD = 1000;

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Every object URL handed out, so none leak when the page unmounts. */
  const objectUrlsRef = useRef<string[]>([]);

  const hasUserMessage = messages.some((message) => message.sender === "user");

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

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

  const resetInput = () => {
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
      textareaRef.current.style.overflowY = "hidden";
    }
  };

  /** The real round-trip: persists the turn, asks the AI provider for a reply, and returns real catalog picks (never invented ones). */
  const sendToAssistant = async (content: string) => {
    setMessages((current) => [...current, { id: makeId(), sender: "user", text: content, isNew: true }]);
    setIsTyping(true);
    try {
      const result = await chatbotApi.sendMessage({
        sessionId: getSessionId(),
        content,
        conversationId,
        language: "EN",
      });
      setConversationId(result.conversation.id);
      setMessages((current) => [
        ...current,
        {
          id: result.message.id,
          sender: "bot",
          text: result.message.content,
          products: result.products.length ? result.products : undefined,
          isNew: true,
        },
      ]);
    } catch (cause) {
      toast.error("Couldn't reach the assistant", {
        description: cause instanceof ApiError ? cause.message : "Please check your connection and try again.",
      });
      setMessages((current) => [
        ...current,
        { id: makeId(), sender: "bot", text: "Sorry, something went wrong on my end — please try that again.", isNew: true },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const chooseRoom = (room: string) => {
    if (hasUserMessage || isTyping) return;
    void sendToAssistant(`I'm designing a ${room.toLowerCase()}. What tiles do you recommend?`);
  };

  const pickAttachment = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Unsupported file", { description: "Attach a photo or a video of your room." });
      return;
    }
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      toast.error("File too large", { description: `Keep attachments under ${MAX_ATTACHMENT_MB} MB.` });
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    setAttachment({ kind: isImage ? "image" : "video", name: file.name, url });
  };

  const clearAttachment = () => setAttachment(null);

  /**
   * Styled photo/video previews (doc 3.6) need a real image/video generation
   * model and somewhere to upload the file to first — neither exists in this
   * environment yet (see the media providers, both still stubs). Rather than
   * fake a "rendering your preview" animation over the customer's own photo,
   * this shows their attachment (that part is real) and says plainly that
   * the styled-preview feature isn't available yet, steering them back to
   * the real, working part of the assistant.
   */
  const sendAttachment = (media: ChatAttachment, text: string) => {
    setMessages((current) => [
      ...current,
      { id: makeId(), sender: "user", text, attachment: media, isNew: true },
    ]);
    setAttachment(null);
    setIsTyping(true);

    window.setTimeout(() => {
      setIsTyping(false);
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          sender: "bot",
          text: "Styled photo and video previews aren't available yet in this environment — but tell me the room, size, and colors and I can recommend real tiles from our catalog right now.",
          isNew: true,
        },
      ]);
    }, 650);
  };

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const answer = input.trim();

    if (attachment && !isTyping) {
      resetInput();
      sendAttachment(
        attachment,
        answer ||
          (attachment.kind === "image"
            ? "Here's a photo of my room — show me how these tiles would look."
            : "Here's a video of my room — apply the design to it."),
      );
      return;
    }

    if (!answer || answer.length > MAX_MESSAGE_LENGTH || isTyping) return;
    resetInput();
    void sendToAssistant(answer);
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
    void sendToAssistant(followUp.text);
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
                    {message.attachment && (
                      <figure className="mt-3 overflow-hidden rounded-lg bg-black/5">
                        {message.attachment.kind === "image" ? (
                          // Local object URL, so next/image optimisation doesn't apply.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={message.attachment.url}
                            alt={`Your room: ${message.attachment.name}`}
                            className="max-h-64 w-full object-cover"
                          />
                        ) : (
                          <video
                            src={message.attachment.url}
                            controls
                            className="max-h-64 w-full object-cover"
                            aria-label={`Your room video: ${message.attachment.name}`}
                          />
                        )}
                      </figure>
                    )}
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

            {!hasUserMessage && !isTyping && (
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
        {attachment && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-ink">
              {attachment.kind === "image" ? <ImagePlus className="size-4" /> : <Video className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-ink">{attachment.name}</span>
              <span className="block text-[11px] text-muted">
                {attachment.kind === "image" ? "Room photo" : "Room video"} · ready to send
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={clearAttachment}
              aria-label="Remove attachment"
              className="shrink-0 text-muted hover:text-ink"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}

        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={pickAttachment}
            className="sr-only"
            aria-label="Attach a photo or video of your room"
          />
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => handleInputChange(event.target.value)}
            onKeyDown={handleInputKeyDown}
            disabled={isTyping}
            rows={1}
            placeholder={attachment ? "Add a note about your room (optional)…" : "Type your message here..."}
            className="h-14 min-h-14 max-h-35 overflow-y-hidden rounded-xl bg-white px-3 py-3.5 pr-26 text-sm leading-normal"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isTyping}
            aria-label="Attach a photo or video of your room"
            className="absolute bottom-3 right-14 top-auto size-9 rounded-full text-muted hover:bg-secondary hover:text-ink"
          >
            <Paperclip className="size-4" />
          </Button>
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={isTyping || input.length > MAX_MESSAGE_LENGTH || (attachment ? false : !input.trim())}
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
            Press Enter to submit · Shift + Enter for a new line · Attach a room photo or video to
            share with the assistant
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

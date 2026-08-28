"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  CornerDownRight,
  ImagePlus,
  Loader2,
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
import { followUps, recommendedProducts, roomOptions, type ChatProduct } from "@/data/chat";
import { cn } from "@/lib/utils";

/**
 * A photo or video of the customer's own room, attached to a message. The doc
 * (3.6) asks the assistant to generate a preview of the room styled with the
 * selected tiles, and to accept a client-submitted video and return a version
 * with the design applied — both start from an attachment like this.
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
  products?: ChatProduct[];
  attachment?: ChatAttachment;
  /** Set while the room preview for `attachment` is still rendering. */
  renderingPreview?: boolean;
  isNew?: boolean;
};

const MAX_ATTACHMENT_MB = 25;

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
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Every object URL handed out, so none leak when the page unmounts. */
  const objectUrlsRef = useRef<string[]>([]);

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
   * Sends the attached room photo/video with the message and stands in for the
   * image/video model round-trip, which replies with the styled preview.
   */
  const sendAttachment = (media: ChatAttachment, text: string) => {
    const messageId = makeId();
    setMessages((current) => [
      ...current,
      { id: messageId, sender: "user", text, attachment: media, isNew: true },
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
          text:
            media.kind === "image"
              ? "Working on a preview of your room with these tiles applied — this takes a moment."
              : "Got your video. I'm applying the selected design to the footage — this takes a little longer than a photo.",
          attachment: media,
          renderingPreview: true,
          isNew: true,
        },
      ]);
    }, 650);
  };

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const answer = input.trim();

    if (attachment && !isTyping) {
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "56px";
        textareaRef.current.style.overflowY = "hidden";
      }
      sendAttachment(
        attachment,
        answer ||
          (attachment.kind === "image"
            ? "Here's a photo of my room — show me how these tiles would look."
            : "Here's a video of my room — apply the design to it."),
      );
      return;
    }

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
                    {message.attachment && (
                      <figure className="mt-3 overflow-hidden rounded-lg bg-black/5">
                        {message.attachment.kind === "image" ? (
                          // Local object URL, so next/image optimisation doesn't apply.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={message.attachment.url}
                            alt={
                              message.renderingPreview
                                ? "Preview of your room being generated"
                                : `Your room: ${message.attachment.name}`
                            }
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
                        {message.renderingPreview && (
                          <figcaption className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-600">
                            <Loader2 className="size-3 animate-spin" />
                            Rendering your styled preview…
                          </figcaption>
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
            disabled={(step === "room" && !attachment) || isTyping}
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
            disabled={
              isTyping ||
              input.length > MAX_MESSAGE_LENGTH ||
              (attachment ? false : !input.trim() || step === "room")
            }
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
            Press Enter to submit · Shift + Enter for a new line · Attach a room photo or video for a
            styled preview
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

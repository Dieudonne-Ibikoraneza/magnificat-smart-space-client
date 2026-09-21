"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Bath,
  BedDouble,
  Bot,
  ChefHat,
  Check,
  ChevronDown,
  CornerDownRight,
  History,
  Maximize2,
  Paperclip,
  RotateCcw,
  Search,
  Send,
  Sofa,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ChatProductCard } from "@/components/chat-product-card";
import { chatbotFollowUps } from "@/lib/chatbot-follow-ups";
import { chatbotApi, eventsApi, productsApi, settingsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { roomTypeLabels } from "@/lib/api/mappers";
import { useApi } from "@/lib/api/use-api";
import type {
  ChatConversationSummary,
  ChatMessageAttachment,
  ChatRecommendation,
  ProfilingQuestion,
  RecommendationDecision,
  RoomType,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/current-user";
import { getSessionId } from "@/lib/session-id";

type ChatMessage = {
  id: string;
  sender: "bot" | "user";
  text: string;
  products?: ChatRecommendation[];
  /** Doc 3.6's "put this tile on my floor" preview, on either side of the
   * turn — the customer's own room photo, or the assistant's edited result.
   * Persisted server-side on `ChatMessage.attachments`, so this same shape
   * comes back on a reload — see `chatbotApi.history`. */
  attachment?: ChatMessageAttachment;
  isNew?: boolean;
};

/** A room photo picked but not sent yet — held locally until a tile is also chosen. */
type PendingRoomPhoto = { file: File; previewUrl: string };
type TileOption = { id: string; name: string; image: string };

const MAX_ATTACHMENT_MB = 15;

const makeId = () => `${Date.now()}-${Math.random()}`;
const MAX_MESSAGE_LENGTH = 2000;
const MESSAGE_COUNT_THRESHOLD = 1000;

/**
 * Persists which conversation ("project") this browser last had open for this
 * customer, so reopening the chatbot resumes it instead of starting over —
 * both the conversation id *and* the exact session id it was created under,
 * since `ChatbotService.sendMessage` resolves an existing conversation by the
 * (customer, sessionId) pair: reusing the wrong session id would silently
 * resume a stale conversation instead of the one just saved (or, for "start
 * new project" below, resume the *old* one instead of truly starting fresh).
 */
type SavedConversation = { conversationId: string; sessionId: string };
const savedConversationKey = (userId: string) =>
  `mss.chatbot.conversation.${userId}`;

const readSavedConversation = (userId: string): SavedConversation | null => {
  try {
    const raw = window.localStorage.getItem(savedConversationKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedConversation>;
    return parsed.conversationId && parsed.sessionId
      ? (parsed as SavedConversation)
      : null;
  } catch {
    return null;
  }
};

/**
 * The pre-recommendation questionnaire has no conversation yet to persist it
 * against (that's only created once the first message actually reaches the
 * backend) — without saving progress somewhere, a crash, a bad connection, or
 * just an accidental reload partway through Q&A threw away every answer the
 * customer had already given, back to question 1. Saved after every answer,
 * cleared the moment a real conversation exists (`sendToAssistant`'s success
 * path) or "start new project" is chosen.
 */
type SavedProfilingProgress = {
  activeQueue: ProfilingQuestion[];
  profilingIndex: number;
  profilingAnswers: { question: string; answer: string }[];
  selectedRoomType: RoomType | null;
  messages: { id: string; sender: "bot" | "user"; text: string }[];
};
const savedProfilingKey = (userId: string) => `mss.chatbot.profiling.${userId}`;

const readSavedProfilingProgress = (
  userId: string,
): SavedProfilingProgress | null => {
  try {
    const raw = window.localStorage.getItem(savedProfilingKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedProfilingProgress>;
    return parsed.activeQueue && parsed.activeQueue.length > 0
      ? (parsed as SavedProfilingProgress)
      : null;
  } catch {
    return null;
  }
};

const clearSavedProfilingProgress = (userId: string) => {
  window.localStorage.removeItem(savedProfilingKey(userId));
};

/**
 * Whether this admin-configured question IS "which room are you designing"
 * — excluded from the queue, since the dedicated room-select step below now
 * covers that, deterministically, before any question is asked. A customer
 * typing a free-text answer to "which room" was never reliable (empty,
 * gibberish, "both", a typo) and it silently broke which conditional
 * questions got asked next.
 *
 * Anchored to "which/what room ..." specifically, not a bare `/room/i` —
 * that broader pattern also matches ordinary questions that merely mention
 * "room" in passing ("what is the room size...", "...wall paint color of
 * the room!", "...roof of the room"), which this must never exclude: they
 * only look room-adjacent by coincidence and are still meant to be asked.
 */
const isRoomQuestion = (question: ProfilingQuestion) =>
  /^(which|what)\s+room\b/i.test(question.text.trim());

/** Exact English wording of the room question this replaces, kept as one
 * synthetic "Question 1 / Answer" entry in the brief sent to the assistant —
 * same shape and position every admin-authored answer already gets, so nothing
 * downstream (the AI prompt, admin analytics) needs to treat this one differently. */
const ROOM_QUESTION_TEXT = "Which room are you designing?";

const ROOM_TYPE_KEYS: Record<RoomType, string> = {
  LIVING_ROOM: "catalog.roomTypes.livingRoom",
  BEDROOM: "catalog.roomTypes.bedroom",
  BATHROOM: "catalog.roomTypes.bathroom",
  KITCHEN: "catalog.roomTypes.kitchen",
};

const ROOM_TYPE_ICONS: Record<RoomType, typeof Sofa> = {
  LIVING_ROOM: Sofa,
  BEDROOM: BedDouble,
  BATHROOM: Bath,
  KITCHEN: ChefHat,
};

const roomTypeOptions = Object.keys(roomTypeLabels) as RoomType[];

/** Whether this is the room-size question ("What is the approximate size of the space?") — answering it is the journey funnel's "ENTERED_DIMENSIONS" stage. */
const isSizeQuestion = (question: ProfilingQuestion) =>
  /size|sqm|square met|dimension/i.test(question.text);

/**
 * Best-effort area out of a free-text answer to the size question (e.g.
 * "20 sqm", "about 25", "5m x 4m") — the first number found, or `undefined`
 * when there isn't one to parse. Feeds the journey drill-down's "what was
 * entered" detail; a miss just means that event falls back to a generic
 * summary server-side, same as never sending it at all.
 */
const areaSqmFromAnswer = (answer: string): number | undefined => {
  const match = answer.match(/\d+(\.\d+)?/);
  if (!match) return undefined;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : undefined;
};

/**
 * Edge-to-edge viewer for a chat image — the uploaded room photo (shown tiny
 * inline) and the generated preview both open into this. Backdrop click, the
 * close button, or Escape all dismiss it; body scroll is locked while open.
 */
const ImageLightbox = ({
  url,
  alt,
  onClose,
}: {
  url: string | null;
  alt: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!url) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="animate-in fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-150"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("chatbot.closeFullScreen")}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      {/* A signed Supabase Storage URL — next/image optimisation doesn't apply. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
};

export default function ChatbotPage() {
  const { t } = useTranslation();
  const initialMessages = useMemo<ChatMessage[]>(
    () => [{ id: "welcome", sender: "bot", text: t("chatbot.welcome") }],
    [t],
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined,
  );
  /** The session id this conversation was (or will be) created under — see `SavedConversation`. `null` until either a saved one is restored or the first send mints one. */
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingRoomPhoto | null>(
    null,
  );
  const [selectedTile, setSelectedTile] = useState<TileOption | null>(null);
  const [tileSearch, setTileSearch] = useState("");
  const [isSendingPreview, setIsSendingPreview] = useState(false);
  /** The image currently opened full screen (uploaded room photo or generated preview), or `null`. */
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(
    null,
  );

  // The pre-recommendation questionnaire (doc 3.10: admin-configured
  // profiling questions) — asked once, in order, before the assistant is
  // allowed to recommend anything. `activeQueue` starts as every
  // always-asked question and grows once the room is known to also include
  // that room's conditional-only questions.
  const [allQuestions, setAllQuestions] = useState<ProfilingQuestion[]>([]);
  const [activeQueue, setActiveQueue] = useState<ProfilingQuestion[]>([]);
  const [profilingIndex, setProfilingIndex] = useState(0);
  const [profilingAnswers, setProfilingAnswers] = useState<
    { question: string; answer: string }[]
  >([]);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(
    null,
  );
  const [phase, setPhase] = useState<"room-select" | "profiling" | "chatting">(
    "room-select",
  );

  // Customer feedback on a whole batch of recommendations (one bot turn), not
  // per card — "did these three picks work for you overall?" Keyed by the
  // bot message id so each recommendation turn keeps its own reaction.
  const [batchDecisions, setBatchDecisions] = useState<
    Record<string, RecommendationDecision>
  >({});
  const { user, loading: userLoading } = useCurrentUser();

  // The customer's past conversations ("projects") — fetched lazily (only
  // once the switcher is actually opened) so a customer who never touches it
  // costs nothing extra. Starting a new project no longer discards the old
  // one: it's still sitting right here, one click away.
  const [pastConversations, setPastConversations] = useState<
    ChatConversationSummary[] | null
  >(null);
  const [pastConversationsLoading, setPastConversationsLoading] =
    useState(false);

  // Tile choices for the room-photo preview — only fetched once a photo is
  // actually picked, and re-fetched as the customer searches within them.
  const { data: tileResults, loading: tilesLoading } = useApi(
    () =>
      pendingPhoto
        ? productsApi.list({ search: tileSearch || undefined, limit: 24 })
        : Promise.resolve(undefined),
    [pendingPhoto, tileSearch],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** Fires the journey funnel's "ENTERED_DIMENSIONS" stage once, the first time the customer answers the room-size profiling question. */
  const enteredDimensionsFiredRef = useRef(false);
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
        scrollArea.scrollHeight -
        scrollArea.scrollTop -
        scrollArea.clientHeight;
      setShowScrollButton(distanceFromBottom > 240);
    };

    updateScrollButton();
    scrollArea.addEventListener("scroll", updateScrollButton, {
      passive: true,
    });
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

  const revealBotMessage = (text: string) => {
    setIsTyping(true);
    window.setTimeout(() => {
      setIsTyping(false);
      setMessages((current) => [
        ...current,
        { id: makeId(), sender: "bot", text, isNew: true },
      ]);
    }, 500);
  };

  /**
   * Loads one conversation's full history into view and makes it "the" open
   * conversation — shared by the initial-mount resume below and by picking a
   * conversation from the "Past projects" switcher, so switching works
   * exactly like reloading onto a saved one always has.
   */
  const openConversation = async (
    conversationId: string,
    sessionId: string,
    isStillActive: () => boolean = () => true,
  ) => {
    const history = await chatbotApi.history(conversationId);
    if (!isStillActive()) return;
    setConversationId(conversationId);
    setChatSessionId(sessionId);
    setPhase("chatting");
    setIsTyping(false);
    setMessages([
      ...initialMessages,
      ...history.map((message) => ({
        id: message.id,
        sender: message.role === "USER" ? ("user" as const) : ("bot" as const),
        text: message.content,
        products: message.products?.length ? message.products : undefined,
        attachment: message.attachment,
      })),
    ]);
    // A batch already decided before this reload shows its "thanks"
    // state immediately instead of the buttons — "PENDING" (Prisma's
    // default for a never-decided row) counts as not decided yet.
    setBatchDecisions(
      Object.fromEntries(
        history
          .filter(
            (message) => message.decision && message.decision !== "PENDING",
          )
          .map((message) => [message.id, message.decision!]),
      ),
    );
    if (user?.id) {
      window.localStorage.setItem(
        savedConversationKey(user.id),
        JSON.stringify({
          conversationId,
          sessionId,
        } satisfies SavedConversation),
      );
      clearSavedProfilingProgress(user.id);
    }
  };

  /** Fetches the customer's past projects on demand — called when the switcher is opened. */
  /** `silent` skips the loading flag and error toast — for the background
   * refreshes after sending a message or starting a new project, where a
   * transient failure shouldn't interrupt the customer with an unrelated
   * error about a sidebar list they didn't even ask to reload. */
  const loadPastConversations = async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setPastConversationsLoading(true);
    try {
      const conversations = await chatbotApi.myConversations();
      setPastConversations(conversations);
    } catch {
      if (!silent) toast.error(t("chatbot.pastProjectsLoadFailed"));
    } finally {
      if (!silent) setPastConversationsLoading(false);
    }
  };

  const switchToPastConversation = async (
    conversation: ChatConversationSummary,
  ) => {
    if (conversation.id === conversationId) return;
    clearPendingPhoto();
    resetInput();
    try {
      await openConversation(conversation.id, conversation.sessionId);
    } catch (cause) {
      toast.error(t("chatbot.toast.reachFailedTitle"), {
        description:
          cause instanceof ApiError
            ? cause.message
            : t("chatbot.toast.connectionBody"),
      });
    }
  };

  // The right-hand sidebar (large screens) shows this list without the
  // customer ever having to open the "Past projects" dropdown that drives it
  // on smaller screens — so it needs its own eager fetch, once a customer is
  // known, rather than only loading lazily on that dropdown's open event.
  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      await loadPastConversations();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load the real admin-configured profiling questions and kick off the
  // questionnaire — if none are configured (or the fetch fails), skip
  // straight to free-form chat rather than blocking the page on it.
  useEffect(() => {
    if (userLoading) return;
    let active = true;

    (async () => {
      try {
        // Fetched up front regardless of whether a saved conversation is
        // about to be resumed below — `allQuestions` also has to be ready
        // for "New project" to rebuild the questionnaire queue *later*, from
        // a resumed conversation that never itself needed these questions.
        // Kicked off (not awaited) before the resume check so resuming a
        // saved conversation isn't held up waiting on it.
        const questionsPromise = settingsApi
          .profilingQuestions({ language: "EN" })
          .then((questions) => {
            if (active) setAllQuestions(questions);
            return questions;
          });

        const saved = user?.id ? readSavedConversation(user.id) : null;
        if (saved) {
          questionsPromise.catch(() => undefined);
          await openConversation(
            saved.conversationId,
            saved.sessionId,
            () => active,
          );
          return;
        }
        // No saved conversation for this browser+customer — the first send
        // below mints a fresh session id, which is what tells the backend
        // this is a genuinely new conversation rather than resuming one.
        // Awaited only for `allQuestions` (set inside the promise itself)
        // to be ready before the room-select step that follows can build a
        // queue from it.
        await questionsPromise;
        if (!active) return;

        const savedProgress = user?.id
          ? readSavedProfilingProgress(user.id)
          : null;
        if (savedProgress) {
          setActiveQueue(savedProgress.activeQueue);
          setProfilingIndex(savedProgress.profilingIndex);
          setProfilingAnswers(savedProgress.profilingAnswers);
          setSelectedRoomType(savedProgress.selectedRoomType);
          setMessages(savedProgress.messages);
          setPhase("profiling");
          setIsTyping(false);
          return;
        }

        // Nothing saved — every new project starts the same way, with the
        // one step nothing else can substitute for: picking a real room
        // from the fixed set below. See `selectRoomType` for what happens
        // once one is picked.
        setPhase("room-select");
        revealBotMessage(t("chatbot.roomSelectPrompt"));
      } catch {
        if (active) {
          setPhase("chatting");
          setIsTyping(false);
        }
      }
    })();

    return () => {
      active = false;
    };
    // `t` is intentionally omitted — it's stable enough in practice (only
    // changes with a language switch, which already remounts this page via
    // the `[lang]` route segment) and including it would re-run this whole
    // mount sequence on every render for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userLoading, initialMessages]);

  // Saves questionnaire progress after every answer, so a reload (or a
  // request that fails partway) resumes exactly where the customer left off
  // instead of resetting to question 1 — see `SavedProfilingProgress`.
  useEffect(() => {
    if (!user?.id || phase !== "profiling" || activeQueue.length === 0) return;
    try {
      window.localStorage.setItem(
        savedProfilingKey(user.id),
        JSON.stringify({
          activeQueue,
          profilingIndex,
          profilingAnswers,
          selectedRoomType,
          messages: messages.map(({ id, sender, text }) => ({
            id,
            sender,
            text,
          })),
        } satisfies SavedProfilingProgress),
      );
    } catch {
      // Best-effort only — a full/blocked localStorage just means a reload
      // mid-questionnaire won't resume, same as before this existed.
    }
  }, [
    user?.id,
    phase,
    activeQueue,
    profilingIndex,
    profilingAnswers,
    selectedRoomType,
    messages,
  ]);

  /** The real round-trip: persists the turn, asks the AI provider for a reply, and returns real catalog picks (never invented ones). */
  const sendToAssistant = async (
    content: string,
    options?: { showUserBubble?: boolean },
  ) => {
    if (options?.showUserBubble ?? true) {
      setMessages((current) => [
        ...current,
        { id: makeId(), sender: "user", text: content, isNew: true },
      ]);
    }
    setIsTyping(true);
    try {
      // Mint a session id on this turn's very first send rather than at
      // mount — `startNewProject` clears `chatSessionId` to force exactly
      // this, since a fresh id (not the previous conversation's) is what
      // makes `ChatbotService.sendMessage` create a genuinely new
      // conversation instead of resuming the old one.
      const sessionId = chatSessionId ?? crypto.randomUUID();
      const result = await chatbotApi.sendMessage({
        sessionId,
        content,
        conversationId,
        language: "EN",
      });
      setConversationId(result.conversation.id);
      setChatSessionId(result.conversation.sessionId);
      if (user?.id) {
        window.localStorage.setItem(
          savedConversationKey(user.id),
          JSON.stringify({
            conversationId: result.conversation.id,
            sessionId: result.conversation.sessionId,
          } satisfies SavedConversation),
        );
        // A real conversation now exists — the questionnaire progress this
        // turn's send just superseded no longer needs its own save.
        clearSavedProfilingProgress(user.id);
      }
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
      // Keeps the always-visible sidebar list (title, last-message preview)
      // current — cheap and best-effort, so a failure here is silent.
      void loadPastConversations(true);
    } catch (cause) {
      toast.error(t("chatbot.toast.reachFailedTitle"), {
        description:
          cause instanceof ApiError
            ? cause.message
            : t("chatbot.toast.connectionBody"),
      });
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          sender: "bot",
          text: t("chatbot.errorReply"),
          isNew: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const startNewProject = () => {
    if (user?.id) {
      window.localStorage.removeItem(savedConversationKey(user.id));
      clearSavedProfilingProgress(user.id);
    }
    setConversationId(undefined);
    // Cleared, not just left alone — the next send must mint a fresh session
    // id (see `sendToAssistant`), or the backend would resolve the old
    // (customer, sessionId) pair right back to the conversation being left.
    setChatSessionId(null);
    setMessages(initialMessages);
    setBatchDecisions({});
    setProfilingAnswers([]);
    setProfilingIndex(0);
    setSelectedRoomType(null);
    setActiveQueue([]);
    clearPendingPhoto();
    resetInput();
    // Every new project starts the same way — picking a real room first,
    // never guessed from free text. See `selectRoomType`.
    setPhase("room-select");
    revealBotMessage(t("chatbot.roomSelectPrompt"));
  };

  /**
   * One reaction for the whole batch of picks in a bot turn, not per card —
   * final, not a toggle: once the customer says a batch helped or didn't,
   * that's their answer, not a setting to keep flipping. The buttons switch
   * to a thank-you the instant this is clicked — the save happens in the
   * background as one request for the whole card, and if it fails the card
   * goes back to undecided (with a message) so it can be answered again.
   */
  const decideBatch = (message: ChatMessage, next: "ACCEPTED" | "REJECTED") => {
    if (batchDecisions[message.id] && batchDecisions[message.id] !== "PENDING")
      return;
    // A bathroom card's wall tile is a separate `Recommendation` row under
    // the hood (see `ChatbotService.persistAndResolveRecommendations`) even
    // though it's shown as one card — the customer's like/dislike on that
    // card has to apply to both rows, not just the floor one.
    const recommendationIds =
      message.products?.flatMap((product) => [
        product.recommendationId,
        ...(product.wallProduct ? [product.wallProduct.recommendationId] : []),
      ]) ?? [];
    if (recommendationIds.length === 0) return;

    // Optimistic, but honest: one request saves the whole card together, and if it fails the
    // card goes back to undecided so the customer can answer again — the screen never claims
    // something the server didn't save.
    setBatchDecisions((current) => ({ ...current, [message.id]: next }));
    void chatbotApi
      .setRecommendationDecisions([...new Set(recommendationIds)], next)
      .catch((cause) => {
        setBatchDecisions((current) => ({ ...current, [message.id]: "PENDING" }));
        toast.error(t("chatbot.toast.feedbackFailedTitle"), {
          description:
            cause instanceof ApiError
              ? cause.message
              : t("chatbot.toast.feedbackFailedBody"),
        });
      });
  };

  /**
   * Every collected answer (the room-select step's synthetic entry
   * included, always first) becomes one "Question N: ... / Answer: ..."
   * block, blank-line separated — a run-on sentence of every question and
   * answer back to back reads ambiguously (to the model and to anyone
   * reading it back, e.g. in the admin asked-questions view) once there are
   * several of them. Hands the whole brief to the real assistant in one
   * turn so it recommends with full context instead of guessing from one line.
   */
  const finishProfiling = (
    answers: { question: string; answer: string }[],
  ) => {
    setPhase("chatting");
    const summary = answers
      .map(
        (entry, index) =>
          `Question ${index + 1}: ${entry.question}\nAnswer: ${entry.answer}`,
      )
      .join("\n\n");
    const recommendationRequest =
      `${summary}\n\nThese are the project and room specifications — from all the products, ` +
      "please recommend the 3 best tiles.";
    void sendToAssistant(recommendationRequest.slice(0, MAX_MESSAGE_LENGTH), {
      showUserBubble: false,
    });
  };

  /**
   * The mandatory first step of every new project: a real room, picked from
   * the fixed set below — never guessed from free text (empty, gibberish, a
   * typo), which used to silently decide which conditional questions came
   * next. Builds the *complete* queue right away (every always-asked
   * question plus this room's own conditionals), since the room is now
   * known from the very first turn instead of discovered partway through.
   */
  const selectRoomType = (roomType: RoomType) => {
    if (isTyping) return;
    const label = t(ROOM_TYPE_KEYS[roomType]);
    setSelectedRoomType(roomType);
    setMessages((current) => [
      ...current,
      { id: makeId(), sender: "user", text: label, isNew: true },
    ]);

    const answers = [{ question: ROOM_QUESTION_TEXT, answer: label }];
    setProfilingAnswers(answers);

    const always = allQuestions
      .filter((question) => question.roomTypes.length === 0 && !isRoomQuestion(question))
      .sort((a, b) => a.position - b.position);
    const conditionals = allQuestions
      .filter((question) => question.roomTypes.includes(roomType))
      .sort((a, b) => a.position - b.position);
    const queue = [...always, ...conditionals];

    if (queue.length === 0) {
      finishProfiling(answers);
      return;
    }
    setActiveQueue(queue);
    setProfilingIndex(0);
    setPhase("profiling");
    revealBotMessage(queue[0].text);
  };

  /**
   * Records the answer to the current profiling question, then either asks
   * the next one or — once every question in the (already complete) queue
   * has been answered — hands everything collected to the real assistant.
   */
  const answerCurrentQuestion = (answerText: string) => {
    const question = activeQueue[profilingIndex];
    if (!question || isTyping) return;

    setMessages((current) => [
      ...current,
      { id: makeId(), sender: "user", text: answerText, isNew: true },
    ]);
    const updatedAnswers = [
      ...profilingAnswers,
      { question: question.text, answer: answerText },
    ];
    setProfilingAnswers(updatedAnswers);

    if (!enteredDimensionsFiredRef.current && isSizeQuestion(question)) {
      enteredDimensionsFiredRef.current = true;
      const areaSqm = areaSqmFromAnswer(answerText);
      void eventsApi
        .journey({
          sessionId: getSessionId(),
          stage: "ENTERED_DIMENSIONS",
          metadata: areaSqm !== undefined ? { areaSqm } : undefined,
        })
        .catch(() => undefined);
    }

    const nextIndex = profilingIndex + 1;
    if (nextIndex < activeQueue.length) {
      setProfilingIndex(nextIndex);
      revealBotMessage(activeQueue[nextIndex].text);
      return;
    }

    finishProfiling(updatedAnswers);
  };

  const pickRoomPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("chatbot.toast.unsupportedFileTitle"), {
        description: t("chatbot.toast.unsupportedFileBody"),
      });
      return;
    }
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      toast.error(t("chatbot.toast.fileTooLargeTitle"), {
        description: t("chatbot.toast.fileTooLargeBody", {
          mb: MAX_ATTACHMENT_MB,
        }),
      });
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    setPendingPhoto({ file, previewUrl: url });
    setSelectedTile(null);
    setTileSearch("");
  };

  const clearPendingPhoto = () => {
    setPendingPhoto(null);
    setSelectedTile(null);
    setTileSearch("");
  };

  /**
   * Doc 3.6's "put this tile on my floor" preview: uploads the room photo,
   * then asks the assistant to edit it with the selected tile on its floor —
   * a real Gemini image-edit call, not a canned response. Both the photo and
   * the (possibly failed) result are saved into the conversation server-side
   * (see `ChatbotService.generateImagePreview`), so a reload shows exactly
   * this turn again without regenerating it.
   */
  const sendRoomTilePreview = async () => {
    if (!pendingPhoto || !selectedTile || isSendingPreview) return;
    const note = input.trim();
    setIsSendingPreview(true);
    resetInput();

    try {
      let convId = conversationId;
      let sessId = chatSessionId;
      if (!convId) {
        const conversation = await chatbotApi.startConversation("EN");
        convId = conversation.id;
        sessId = conversation.sessionId;
        setConversationId(convId);
        setChatSessionId(sessId);
        setPhase("chatting");
        if (user?.id) {
          window.localStorage.setItem(
            savedConversationKey(user.id),
            JSON.stringify({
              conversationId: convId,
              sessionId: sessId,
            } satisfies SavedConversation),
          );
          clearSavedProfilingProgress(user.id);
        }
      }

      const uploaded = await chatbotApi.uploadRoomPhoto(pendingPhoto.file);
      const result = await chatbotApi.roomTilePreview({
        conversationId: convId,
        roomImagePath: uploaded.path,
        productId: selectedTile.id,
        note: note || undefined,
      });

      setMessages((current) => [
        ...current,
        {
          id: result.userMessage.id,
          sender: "user",
          text: result.userMessage.content,
          attachment: result.userMessage.attachment,
          isNew: true,
        },
        {
          id: result.assistantMessage.id,
          sender: "bot",
          text: result.assistantMessage.content,
          attachment: result.assistantMessage.attachment,
          isNew: true,
        },
      ]);

      if (
        result.assistantMessage.attachment.kind === "room-tile-preview" &&
        !result.assistantMessage.attachment.generatedImageUrl
      ) {
        toast.error(t("chatbot.toast.previewFailedTitle"), {
          description: t("chatbot.toast.previewFailedBody"),
        });
      }

      clearPendingPhoto();
    } catch (cause) {
      toast.error(t("chatbot.toast.roomPreviewFailedTitle"), {
        description:
          cause instanceof ApiError
            ? cause.message
            : t("chatbot.toast.connectionBody"),
      });
    } finally {
      setIsSendingPreview(false);
    }
  };

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // The room-select step only accepts a button pick (see `selectRoomType`)
    // — the composer itself is disabled while this phase is active, but
    // this guards against a stray Enter keypress reaching here regardless.
    if (phase === "room-select") return;
    const answer = input.trim();

    if (pendingPhoto) {
      void sendRoomTilePreview();
      return;
    }

    if (!answer || answer.length > MAX_MESSAGE_LENGTH || isTyping) return;
    resetInput();
    if (phase === "profiling") {
      answerCurrentQuestion(answer);
    } else {
      void sendToAssistant(answer);
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
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  const selectFollowUp = (followUpId: string) => {
    if (isTyping) return;
    const followUp = chatbotFollowUps.find((item) => item.id === followUpId);
    if (!followUp) return;
    void sendToAssistant(t(followUp.textKey));
  };

  const showFollowUps = messages.some((message) => message.products?.length);
  const showCharacterCount = input.length > MESSAGE_COUNT_THRESHOLD;

  return (
    <div className="flex h-full min-h-0 w-full gap-4">
      {/* Fixed left-hand rail on large screens — replaces the header's
          dropdown-based "Past projects"/"New project" pair (still shown on
          smaller screens above) and puts the blank space beside the narrow
          centered chat column to use. */}
      {user && (
        <aside className="hidden max-h-[70vh] w-72 shrink-0 flex-col self-center justify-center rounded-2xl bg-transparent lg:flex">
          <div className="p-3">
            <Button
              type="button"
              onClick={startNewProject}
              className="h-10 w-full gap-2 rounded-full text-xs font-bold"
            >
              <RotateCcw className="size-3.5" /> {t("chatbot.newProject")}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("chatbot.pastProjects")}
            </p>
            {pastConversationsLoading &&
              (pastConversations?.length ?? 0) === 0 && (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-12 animate-pulse rounded-lg bg-muted-background"
                      aria-hidden="true"
                    />
                  ))}
                </div>
              )}
            {!pastConversationsLoading &&
              (pastConversations?.length ?? 0) === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  {t("chatbot.pastProjectsEmpty")}
                </p>
              )}
            {pastConversations?.map((conversation) => {
              const isCurrent = conversation.id === conversationId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => void switchToPastConversation(conversation)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-secondary",
                    isCurrent && "bg-secondary",
                  )}
                >
                  {/* The title is already just the first message the customer
                      sent (see `ChatbotService.sendMessage`) — showing the
                      conversation's own last message too, on a second line,
                      doubled the row height for a preview that's often the
                      assistant's long recommendation text. One line is enough
                      to tell projects apart. */}
                  <span className="truncate text-xs font-semibold text-ink">
                    {conversation.title || t("chatbot.untitledProject")}
                  </span>
                  {isCurrent && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                      {t("chatbot.currentProjectBadge")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      )}

      <div className="grid h-full min-h-0 w-full min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
        <div className="relative min-h-0 overflow-hidden">
          {/* Spans the full width of the page (not just the centered column
            below) so a scroll/wheel gesture anywhere over this row — including
            the blank gutters beside the narrow chat column on a wide screen —
            moves the same messages, instead of only working when the pointer
            happens to be directly over the centered content. */}
          <div
            ref={scrollRef}
            className="scrollbar-hide h-full w-full overflow-x-hidden overflow-y-auto overscroll-y-contain"
          >
            <div className="mx-auto max-w-3xl px-5 sm:px-2">
              <section
                className="px-1 pb-4 pt-2 sm:px-0"
                aria-label={t("chatbot.introAria")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-ink sm:text-2xl">
                      {t("chatbot.title")}
                    </h1>
                    <p className="mt-1 text-xs text-muted sm:text-sm">
                      {user ? t("chatbot.savedNote") : t("chatbot.signInNote")}
                    </p>
                  </div>
                  {/* On large screens this same functionality lives in the
                    fixed left-hand sidebar instead — see the <aside> above —
                    so it isn't duplicated here. */}
                  <div className="flex items-center gap-2 lg:hidden">
                    {user && (
                      <DropdownMenu
                        onOpenChange={(open) => {
                          if (open) void loadPastConversations();
                        }}
                      >
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 gap-2 rounded-full px-3 text-xs font-bold"
                            />
                          }
                        >
                          <History className="size-3.5" />{" "}
                          {t("chatbot.pastProjects")}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-72"
                          aria-label={t("chatbot.pastProjectsAria")}
                        >
                          {pastConversationsLoading && (
                            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                              {t("chatbot.loading")}
                            </div>
                          )}
                          {!pastConversationsLoading &&
                            (pastConversations?.length ?? 0) === 0 && (
                              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                                {t("chatbot.pastProjectsEmpty")}
                              </div>
                            )}
                          {!pastConversationsLoading &&
                            pastConversations?.map((conversation) => {
                              const lastMessage = conversation.messages[0];
                              const isCurrent =
                                conversation.id === conversationId;
                              return (
                                <DropdownMenuItem
                                  key={conversation.id}
                                  onClick={() =>
                                    void switchToPastConversation(conversation)
                                  }
                                  className="flex flex-col items-start gap-0.5 py-2"
                                >
                                  <span className="flex w-full items-center justify-between gap-2">
                                    <span className="truncate text-sm font-semibold text-ink">
                                      {conversation.title ||
                                        t("chatbot.untitledProject")}
                                    </span>
                                    {isCurrent && (
                                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                                        {t("chatbot.currentProjectBadge")}
                                      </span>
                                    )}
                                  </span>
                                  {lastMessage && (
                                    <span className="line-clamp-1 w-full text-left text-xs text-muted-foreground">
                                      {lastMessage.content}
                                    </span>
                                  )}
                                </DropdownMenuItem>
                              );
                            })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startNewProject}
                      className="h-9 gap-2 rounded-full px-3 text-xs font-bold"
                    >
                      <RotateCcw className="size-3.5" />{" "}
                      {t("chatbot.newProject")}
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-7" aria-live="polite">
                {messages.map((message) => {
                  const attachment = message.attachment;
                  return (
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
                          {attachment?.kind === "room-photo" && (
                            // The uploaded room photo rides along as a small chip —
                            // it's context for the request, not the thing worth
                            // looking at; tap it to see it full screen.
                            <button
                              type="button"
                              onClick={() =>
                                setLightbox({
                                  url: attachment.url,
                                  alt: t("chatbot.yourRoom"),
                                })
                              }
                              className="group mt-3 flex items-center gap-2 rounded-lg border border-white/15 bg-black/10 p-1.5 text-left transition-colors hover:bg-black/20"
                            >
                              {/* A signed Supabase Storage URL — next/image optimisation doesn't apply. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={attachment.url}
                                alt={t("chatbot.yourRoom")}
                                className="size-12 shrink-0 rounded-md object-cover"
                              />
                              <span className="inline-flex items-center gap-1 pr-1 text-[11px] font-medium opacity-80 group-hover:opacity-100">
                                <Maximize2 className="size-3" />{" "}
                                {t("chatbot.viewFullScreen")}
                              </span>
                            </button>
                          )}
                          {attachment?.kind === "room-tile-preview" &&
                            (() => {
                              const previewUrl =
                                attachment.generatedImageUrl ??
                                attachment.roomImageUrl;
                              const previewAlt = attachment.generatedImageUrl
                                ? t("chatbot.roomWithTile", {
                                    tile: attachment.productName,
                                  })
                                : t("chatbot.yourRoom");
                              return (
                                <figure className="group relative mt-3 overflow-hidden rounded-lg bg-black/5">
                                  {/* The generated result is the payload of this turn —
                                shown large, natural aspect ratio, and openable
                                full screen. A failed generation falls back to the
                                room photo, dimmed. */}
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={previewUrl}
                                    alt={previewAlt}
                                    className={cn(
                                      "w-full rounded-lg object-contain",
                                      attachment.generatedImageUrl
                                        ? "max-h-[34rem]"
                                        : "max-h-72 opacity-60",
                                    )}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLightbox({
                                        url: previewUrl,
                                        alt: previewAlt,
                                      })
                                    }
                                    aria-label={t("chatbot.viewFullScreen")}
                                    className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity hover:bg-black/75 focus-visible:opacity-100 group-hover:opacity-100"
                                  >
                                    <Maximize2 className="size-3" />{" "}
                                    {t("chatbot.fullScreen")}
                                  </button>
                                </figure>
                              );
                            })()}
                        </div>
                        {message.sender === "user" && (
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                            <UserRound className="size-4" />
                          </span>
                        )}
                        {message.products && (
                          <>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                              {message.products.map((product) => (
                                <ChatProductCard
                                  key={product.id}
                                  product={product}
                                />
                              ))}
                            </div>
                            <div className="mt-3 rounded-xl bg-white p-4 shadow-sm sm:p-5">
                              <div className="flex items-center gap-2">
                                <Sparkles className="size-4 text-amber" />
                                <h4 className="text-xs font-bold tracking-wide text-ink uppercase sm:text-sm">
                                  {t("chatbot.whyPicks")}
                                </h4>
                              </div>
                              <ul className="mt-3 space-y-3">
                                {message.products.map((product) => (
                                  <li
                                    key={product.id}
                                    className="flex items-start gap-3"
                                  >
                                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-ink">
                                      {Math.round(product.matchScore)}%
                                    </span>
                                    <p className="text-xs leading-5 text-slate-600 sm:text-[13px]">
                                      <span className="font-bold text-ink">
                                        {product.name}
                                      </span>{" "}
                                      — {product.reason}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {batchDecisions[message.id] &&
                            batchDecisions[message.id] !== "PENDING" ? (
                              <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm sm:p-5">
                                <span
                                  className={cn(
                                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                                    batchDecisions[message.id] === "ACCEPTED"
                                      ? "bg-green-50 text-green-600"
                                      : "bg-amber-50 text-amber-600",
                                  )}
                                >
                                  {batchDecisions[message.id] === "ACCEPTED" ? (
                                    <ThumbsUp className="size-4" />
                                  ) : (
                                    <ThumbsDown className="size-4" />
                                  )}
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-ink sm:text-sm">
                                    {t("chatbot.feedback.thanksTitle")}
                                  </p>
                                  <p className="mt-0.5 text-xs leading-5 text-muted sm:text-[13px]">
                                    {batchDecisions[message.id] === "ACCEPTED"
                                      ? t("chatbot.feedback.acceptedBody")
                                      : t("chatbot.feedback.rejectedBody")}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:p-5">
                                <p className="text-xs font-bold text-ink sm:text-sm">
                                  {t("chatbot.feedback.prompt")}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                      decideBatch(message, "ACCEPTED")
                                    }
                                    className="h-9 gap-1.5 rounded-full border-slate-200 px-3.5 text-xs font-bold text-muted hover:text-ink"
                                  >
                                    <ThumbsUp className="size-3.5" />{" "}
                                    {t("chatbot.feedback.like")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                      decideBatch(message, "REJECTED")
                                    }
                                    className="h-9 gap-1.5 rounded-full border-slate-200 px-3.5 text-xs font-bold text-muted hover:text-ink"
                                  >
                                    <ThumbsDown className="size-3.5" />{" "}
                                    {t("chatbot.feedback.dislike")}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white text-amber shadow-sm">
                      <Bot className="size-4" />
                    </span>
                    <div
                      className="flex items-center gap-1 px-2 py-3"
                      aria-label={t("chatbot.typingAria")}
                    >
                      <span className="size-1.5 animate-bounce rounded-full bg-slate-300" />
                      <span className="size-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
              </section>

              {phase === "room-select" && !isTyping && (
                <section
                  className="mt-2 grid grid-cols-2 gap-3"
                  aria-label={t("chatbot.roomSelectAria")}
                >
                  {roomTypeOptions.map((option) => {
                    const Icon = ROOM_TYPE_ICONS[option];
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => selectRoomType(option)}
                        className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center transition-colors hover:border-primary hover:bg-primary/10"
                      >
                        <Icon className="size-6 text-ink" />
                        <span className="text-xs font-bold text-ink">
                          {t(ROOM_TYPE_KEYS[option])}
                        </span>
                      </button>
                    );
                  })}
                </section>
              )}

              {showFollowUps && (
                <section className="mt-8 border-t border-slate-200/70 pt-8">
                  <h2 className="text-base font-bold text-ink">
                    {t("chatbot.followUpsTitle")}
                  </h2>
                  <div className="mt-3 divide-y divide-slate-200/70">
                    {chatbotFollowUps.map((followUp) => (
                      <Button
                        key={followUp.id}
                        type="button"
                        variant="ghost"
                        disabled={isTyping}
                        onClick={() => selectFollowUp(followUp.id)}
                        className="h-auto min-h-10 w-full justify-start gap-3 rounded-none px-2 py-2.5 text-left text-xs font-medium text-muted hover:text-ink sm:text-sm"
                      >
                        <CornerDownRight className="size-4 shrink-0 text-slate-400" />
                        {t(followUp.textKey)}
                      </Button>
                    ))}
                  </div>
                </section>
              )}

              <div ref={endRef} className="h-4 shrink-0" aria-hidden="true" />
            </div>
          </div>

          {showScrollButton && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto flex max-w-3xl justify-center px-5 sm:px-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={scrollToBottom}
                aria-label={t("chatbot.scrollToLatest")}
                className="pointer-events-auto z-10 size-10 rounded-full border-slate-200 bg-white shadow-md hover:bg-primary"
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
          )}
        </div>

        <form
          onSubmit={submitAnswer}
          className="z-10 mx-auto w-full max-w-3xl shrink-0 bg-background px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-2"
        >
          {pendingPhoto && (
            <div className="mb-2 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-black/5">
                  {/* Local object URL — next/image optimisation doesn't apply. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingPhoto.previewUrl}
                    alt={t("chatbot.yourRoom")}
                    className="size-full object-cover"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-ink">
                    {selectedTile
                      ? t("chatbot.pendingPhoto.tileOnFloor", {
                          tile: selectedTile.name,
                        })
                      : t("chatbot.pendingPhoto.chooseTile")}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {selectedTile
                      ? t("chatbot.pendingPhoto.readyToSend")
                      : t("chatbot.pendingPhoto.pickBelow")}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={clearPendingPhoto}
                  disabled={isSendingPreview}
                  aria-label={t("chatbot.pendingPhoto.remove")}
                  className="shrink-0 text-muted hover:text-ink"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input
                  value={tileSearch}
                  onChange={(event) => setTileSearch(event.target.value)}
                  placeholder={t("chatbot.pendingPhoto.searchTiles")}
                  disabled={isSendingPreview}
                  className="h-9 rounded-full pl-9 text-xs"
                />
              </div>

              <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                {tilesLoading &&
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`tile-skeleton-${index}`}
                      className="w-16 shrink-0"
                      aria-hidden="true"
                    >
                      <span className="block aspect-square animate-pulse rounded-lg bg-slate-200" />
                      <span className="mt-1 block h-2.5 w-11 animate-pulse rounded bg-slate-200" />
                    </div>
                  ))}
                {!tilesLoading && tileResults?.items.length === 0 && (
                  <p className="py-2 text-xs text-muted">
                    {t("chatbot.pendingPhoto.noTiles")}
                  </p>
                )}
                {!tilesLoading &&
                  tileResults?.items.map((product) => {
                    const isSelected = selectedTile?.id === product.id;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        disabled={isSendingPreview}
                        onClick={() =>
                          setSelectedTile({
                            id: product.id,
                            name: product.name,
                            image: product.image,
                          })
                        }
                        aria-pressed={isSelected}
                        aria-label={t("chatbot.pendingPhoto.selectTileAria", {
                          name: product.name,
                        })}
                        className="w-16 shrink-0 text-left"
                      >
                        <span
                          className={cn(
                            "relative block aspect-square overflow-hidden rounded-lg border-2",
                            isSelected
                              ? "border-primary"
                              : "border-transparent",
                          )}
                        >
                          {/* A signed Supabase Storage URL — next/image optimisation doesn't apply. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.image}
                            alt={product.name}
                            className="size-full object-cover"
                          />
                          {isSelected && (
                            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-ink">
                              <Check className="size-2.5" strokeWidth={3} />
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block truncate text-[10px] font-medium text-ink">
                          {product.name}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={pickRoomPhoto}
              className="sr-only"
              aria-label={t("chatbot.attachPhotoAria")}
            />
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => handleInputChange(event.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={isTyping || isSendingPreview || phase === "room-select"}
              rows={1}
              placeholder={
                phase === "room-select"
                  ? t("chatbot.roomSelectPlaceholder")
                  : pendingPhoto
                    ? t("chatbot.notePlaceholder")
                    : t("chatbot.inputPlaceholder")
              }
              className="h-14 min-h-14 max-h-35 overflow-y-hidden rounded-xl bg-white px-3 py-3.5 pr-26 text-sm leading-normal"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping || isSendingPreview || phase === "room-select"}
              aria-label={t("chatbot.attachPhotoAria")}
              className="absolute bottom-3 right-14 top-auto size-9 rounded-full text-muted hover:bg-secondary hover:text-ink"
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              type="submit"
              size="icon"
              aria-label={t("chatbot.sendAria")}
              disabled={
                isTyping ||
                isSendingPreview ||
                phase === "room-select" ||
                input.length > MAX_MESSAGE_LENGTH ||
                (pendingPhoto ? !selectedTile : !input.trim())
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
              {t("chatbot.inputHint")}
            </p>
            {showCharacterCount && (
              <p
                className={
                  input.length > MAX_MESSAGE_LENGTH
                    ? "font-semibold text-red-500"
                    : ""
                }
              >
                {t("chatbot.charCount", {
                  current: input.length.toLocaleString(),
                  max: MAX_MESSAGE_LENGTH.toLocaleString(),
                })}
              </p>
            )}
          </div>
        </form>

        <ImageLightbox
          url={lightbox?.url ?? null}
          alt={lightbox?.alt ?? ""}
          onClose={() => setLightbox(null)}
        />
      </div>
    </div>
  );
}

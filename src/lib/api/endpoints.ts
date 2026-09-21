import { api, apiUpload, fetchBlob, tokenStore } from "./client";
import type {
  AnalyticsOverview,
  AnalyticsPeriod,
  ApiCart,
  ApiCartItemRow,
  ApiCartNegotiation,
  ApiCartNegotiationMessage,
  ApiCollection,
  ApiKnowledgeBaseEntry,
  ApiOrder,
  ApiOrderDelivery,
  ApiOrderMessage,
  ApiProduct,
  ApiRoom,
  ApiRoomDesign,
  ApiUser,
  AuthTokens,
  ChatSendResult,
  ChatRecommendation,
  ChatMessageAttachment,
  ApiChatConversation,
  ChatConversationSummary,
  AskedQuestionsPage,
  CursorPage,
  NegotiationInboxThread,
  CustomerAnalytics,
  CustomerDetail,
  CustomerSummary,
  DiscoverySource,
  FloorPlanCalculation,
  FulfillmentQueue,
  HearAboutUs,
  JourneyAnalytics,
  JourneyStage,
  JourneyStageDetail,
  Language,
  LowStockRow,
  OrderStatus,
  OrderType,
  OtpSendResult,
  Paginated,
  PlaceOrderResult,
  PlatformSettings,
  PublicPlatformSettings,
  ProfilingQuestion,
  QuantityCalculation,
  QuotationStatus,
  RecommendationDecision,
  Role,
  RoomType,
  SalesAnalytics,
  StaffSummary,
  StockMovement,
  StockMovementType,
  StockSummary,
  SuitableFor,
  TileAnalytics,
  TileRates,
  TileRecommendations,
  UserStatus,
} from "./types";

/**
 * One function per API route, grouped the way the server groups its modules.
 * Everything a page needs from the backend goes through here — no page builds
 * a URL or reads a token itself, so a route change is a one-line edit.
 */

// --- Auth -------------------------------------------------------------------

export const authApi = {
  discoverySources: () => api.get<DiscoverySource[]>("/auth/discovery-sources", { anonymous: true }),

  register: (body: {
    fullName: string;
    email: string;
    phone: string;
    heardAboutUs: HearAboutUs;
    language?: Language;
  }) => api.post<OtpSendResult>("/auth/register", body, { anonymous: true }),

  login: (email: string) => api.post<OtpSendResult>("/auth/login", { email }, { anonymous: true }),

  resendOtp: (email: string) =>
    api.post<OtpSendResult>("/auth/otp/resend", { email }, { anonymous: true }),

  /**
   * Completes registration or logs in. The API answers with the access token
   * (kept in memory for you) and sets the refresh token as an HttpOnly cookie
   * — `credentials: "include"` is what lets the browser accept it from the
   * API's separate origin.
   */
  verifyOtp: async (email: string, otp: string) => {
    const tokens = await api.post<AuthTokens>(
      "/auth/verify-otp",
      { email, otp },
      { anonymous: true, credentials: "include" },
    );
    tokenStore.set(tokens, { signIn: true });
    return tokens;
  },

  /** Revokes the session server-side and clears its cookie; the local session is dropped either way. */
  logout: async () => {
    // A failed revoke must not strand the user in a signed-in UI.
    await api.post<void>("/auth/logout", {}, { anonymous: true, credentials: "include" }).catch(() => undefined);
    tokenStore.clear();
  },
};

// --- Users ------------------------------------------------------------------

export const usersApi = {
  me: () => api.get<ApiUser>("/users/me"),
  // Phone isn't editable here — `UpdateProfileDto` only accepts `fullName`
  // and `language`; changing a verified phone number is a staff-only action
  // (`updateStaff`), not self-service.
  updateMe: (body: { fullName?: string; language?: Language }) =>
    api.patch<ApiUser>("/users/me", body),
  closeMyAccount: () => api.delete<ApiUser>("/users/me"),

  listCustomers: (
    query: { page?: number; limit?: number; search?: string; status?: UserStatus; sort?: "newest" | "spend" } = {},
  ) => api.get<Paginated<CustomerSummary>>("/users/customers", { query }),
  getCustomer: (id: string, query: { page?: number; limit?: number } = {}) =>
    api.get<CustomerDetail>(`/users/customers/${id}`, { query }),

  staffSummary: () => api.get<StaffSummary>("/users/staff/summary"),
  listStaff: (
    query: { page?: number; limit?: number; role?: Role; status?: UserStatus; search?: string } = {},
  ) => api.get<Paginated<ApiUser>>("/users/staff", { query }),
  createStaff: (body: { fullName: string; email: string; phone: string; role: Role }) =>
    api.post<ApiUser>("/users/staff", body),
  updateStaff: (id: string, body: { fullName?: string; phone?: string; role?: Role }) =>
    api.patch<ApiUser>(`/users/staff/${id}`, body),
  setStaffStatus: (id: string, status: "ACTIVE" | "INACTIVE") =>
    api.patch<ApiUser>(`/users/staff/${id}/status`, { status }),
};

// --- Catalog ----------------------------------------------------------------

export type ProductQuery = {
  page?: number;
  limit?: number;
  collectionId?: string;
  roomType?: RoomType;
  size?: string;
  suitableFor?: SuitableFor;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc";
};

/** Body accepted by `POST /products`; `PATCH` takes any subset of it. */
export type ProductInput = {
  sku: string;
  name: string;
  collectionId: string;
  boxCoverageSqm: number;
  piecesPerBox: number;
  price: number;
  image: string;
  description?: string;
  /**
   * Only sent by an edit authored in the Kinyarwanda admin UI — never
   * together with `name`/`description`, which stay the always-English
   * columns. Sending these instead tells the server this edit is RW -> EN,
   * so it regenerates `name`/`description` rather than the usual other way
   * round (see `products.service.ts#update`).
   */
  nameRw?: string;
  descriptionRw?: string;
  suitableFor?: SuitableFor;
  roomTypes?: RoomType[];
  /** Opening stock in square metres — boxes/pieces are a display conversion only. */
  initialAreaSqm?: number;
  initialCostPrice?: number;
};

/** Body accepted by `POST /collections`; `PATCH` takes any subset of it. */
export type CollectionInput = {
  title: string;
  size: string;
  /** Area of a single tile of this size, in sqm — shared by every product in the collection. */
  tileAreaSqm: number;
  description?: string;
  /** Same RW-authored-edit convention as `ProductInput.nameRw` — see there. */
  titleRw?: string;
  descriptionRw?: string;
  image?: string;
  isActive?: boolean;
};

export const collectionsApi = {
  list: (query: { page?: number; limit?: number } = {}) =>
    api.get<Paginated<ApiCollection>>("/collections", { query }),
  get: (id: string) => api.get<ApiCollection>(`/collections/${id}`),
  create: (body: CollectionInput) => api.post<ApiCollection>("/collections", body),
  update: (id: string, body: Partial<CollectionInput>) =>
    api.patch<ApiCollection>(`/collections/${id}`, body),
  remove: (id: string) => api.delete<void>(`/collections/${id}`),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload<{ bucket: string; path: string; url: string; expiresIn: number; contentType: string; size: number }>(
      "/collections/upload-image",
      formData,
    );
  },
};

export const productsApi = {
  list: (query: ProductQuery = {}) => api.get<Paginated<ApiProduct>>("/products", { query }),
  get: (id: string) => api.get<ApiProduct>(`/products/${id}`),

  /** Polled (debounced) as the user types a SKU on the registration/edit form, so a collision surfaces before submit instead of after. */
  checkSku: (sku: string, excludeId?: string) =>
    api.get<{ available: boolean }>("/products/check-sku", { query: { sku, excludeId } }),

  /** Doc 3.3: area in, boxes/pieces and total price out. */
  calculateQuantity: (productId: string, areaSqm: number) =>
    api.post<QuantityCalculation>("/products/calculate-quantity", { productId, areaSqm }),

  /**
   * Uploads to a private Supabase Storage blob (admin/stock manager only) —
   * `image` in the returned data is a short-lived signed URL good only for
   * an immediate preview; submit `path`, not `image`, as the product's own
   * `image` field when creating/updating it. The server resolves that path
   * to a fresh signed URL on every read, since the one returned here expires.
   */
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload<{ bucket: string; path: string; url: string; expiresIn: number; contentType: string; size: number }>(
      "/products/upload-image",
      formData,
    );
  },

  create: (body: ProductInput) => api.post<ApiProduct>("/products", body),
  update: (id: string, body: Partial<ProductInput>) => api.patch<ApiProduct>(`/products/${id}`, body),
  remove: (id: string) => api.delete<void>(`/products/${id}`),

  /** `changeAreaSqm` is always square metres — boxes/pieces are a display conversion only, never sent here. */
  adjustStock: (
    id: string,
    body: {
      changeAreaSqm: number;
      reason: string;
      type?: StockMovementType;
      reference?: string;
      costPrice?: number;
    },
  ) => api.patch<{ quantityOnHandSqm: number }>(`/products/${id}/stock`, body),
};

/** Doc 3.8: dimensions + wastage in, quantity, stock split and cost out. */
export const calculatorApi = {
  floorPlan: (body: {
    productId: string;
    length?: number;
    width?: number;
    totalAreaSqm?: number;
    wastagePercent?: number;
  }) => api.post<FloorPlanCalculation>("/calculator/floor-plan", body),
};

// --- Cart & favorites -------------------------------------------------------

export const cartApi = {
  view: () => api.get<ApiCart>("/cart"),
  /** Sets the line to exactly `areaSqm` (an upsert, not additive) — returns the raw row, not the computed cart. */
  upsertItem: (productId: string, areaSqm: number) =>
    api.put<ApiCartItemRow>("/cart/items", { productId, areaSqm }),
  removeItem: (productId: string) => api.delete<void>(`/cart/items/${productId}`),
  clear: () => api.delete<void>("/cart"),
};

export const favoritesApi = {
  list: () =>
    api.get<{ id: string; productId: string; createdAt: string; product: ApiProduct }[]>("/favorites"),
  add: (productId: string) => api.post<{ id: string }>("/favorites", { productId }),
  remove: (productId: string) => api.delete<void>(`/favorites/${productId}`),
};

// --- Orders -----------------------------------------------------------------

export const ordersApi = {
  /**
   * A customer's own cart that exceeds stock on hand never becomes an order —
   * the response comes back as `{ orderCreated: false, negotiation }` instead,
   * with their pre-order negotiation thread already opened/continued
   * server-side. Staff placing on a customer's behalf still get
   * `{ orderCreated: true, order }` even over a shortage.
   */
  create: (body: {
    type: OrderType;
    items: { productId: string; areaSqm: number }[];
    customerId?: string;
    notes?: string;
    /** One per checkout attempt, re-sent on retries: if the first reply was lost, the retry gets the same order back. */
    idempotencyKey?: string;
    /** Saved in the same transaction as the order — checkout is one request, not create-then-save. */
    delivery?: {
      contactName: string;
      phone: string;
      address: string;
      city: string;
      preferredDate?: string;
      notes?: string;
    };
  }) => api.post<PlaceOrderResult>("/orders", body),

  list: (
    query: {
      page?: number;
      limit?: number;
      status?: OrderStatus;
      quotationStatus?: QuotationStatus;
      createdByType?: "CUSTOMER" | "STAFF";
      customerId?: string;
    } = {},
  ) => api.get<Paginated<ApiOrder>>("/orders", { query }),

  get: (id: string) => api.get<ApiOrder>(`/orders/${id}`),

  updateStatus: (id: string, status: OrderStatus, note?: string) =>
    api.patch<ApiOrder>(`/orders/${id}/status`, { status, note }),

  /** Stock/admin: revise the quantities agreed during order negotiation. */
  updateItems: (
    id: string,
    body: {
      items: { productId: string; areaSqm: number }[];
      notes?: string;
    },
  ) => api.patch<ApiOrder>(`/orders/${id}/items`, body),

  saveDeliveryDetails: (
    id: string,
    body: {
      contactName: string;
      phone: string;
      address: string;
      city: string;
      preferredDate?: string;
      notes?: string;
    },
  ) => api.patch<ApiOrderDelivery>(`/orders/${id}/delivery-details`, body),

  /** Stock/admin: cost the transport and send the quotation. 0 means free delivery. */
  sendQuotation: (id: string, transportFee: number, transportFeeNote?: string) =>
    api.post<ApiOrder>(`/orders/${id}/quotation`, { transportFee, transportFeeNote }),

  /**
   * Opens the quotation as a PDF (itemized breakdown + our MoMo/bank details —
   * there's no payment gateway wired in, so the customer pays outside the
   * system and marks it done). The customer's own first call here is also
   * what unlocks `markPaymentSubmitted` below.
   */
  viewQuotationPdf: (id: string) => fetchBlob(`/orders/${id}/quotation`),

  markPaymentSubmitted: (id: string) => api.post<ApiOrder>(`/orders/${id}/quotation/payment-submitted`),
  verifyPayment: (id: string) => api.post<ApiOrder>(`/orders/${id}/quotation/verify`),

  /** Stock/admin: the payment couldn't be confirmed — the customer is told `reason` and can pay again. */
  rejectPayment: (id: string, reason: string) =>
    api.post<ApiOrder>(`/orders/${id}/quotation/reject-payment`, { reason }),

  listMessages: (id: string) => api.get<ApiOrderMessage[]>(`/orders/${id}/messages`),
  postMessage: (id: string, body: string) => api.post<ApiOrderMessage>(`/orders/${id}/messages`, { body }),
};

/**
 * Pre-order negotiations: a cart that couldn't be placed as an order because
 * it exceeds stock on hand. Linked to the customer, not an order — see
 * `ApiCartNegotiation`.
 */
/**
 * The staff negotiation inbox (stock manager + admin) — one paginated call
 * for every order and cart thread, newest activity first, instead of one
 * request per thread.
 */
export const negotiationInboxApi = {
  list: (params: { cursor?: string; limit?: number; search?: string } = {}) =>
    api.get<CursorPage<NegotiationInboxThread>>("/negotiations/inbox", { query: params }),

  /** One thread's inbox row — refreshes a single line after a live update. */
  summary: (kind: "order" | "cart", id: string) =>
    api.get<NegotiationInboxThread>(`/negotiations/inbox/${kind}/${id}`),
};

export const cartNegotiationsApi = {
  /** Opens (or continues) the calling customer's thread with a first/next message. */
  submit: (
    items: { productId: string; productName: string; requestedAreaSqm: number; availabilityNote: string }[],
    body: string,
    /** `true` when `items` is the whole cart ("share my cart") — products no longer in it leave the thread's item list. */
    snapshot?: boolean,
  ) => api.post<ApiCartNegotiation>("/cart-negotiations", { items, body, snapshot }),

  /** The calling customer's own thread, or `null` if they've never had one. */
  mine: () => api.get<ApiCartNegotiation | null>("/cart-negotiations/mine"),

  /** Clears the customer's own view of their thread — a fresh start for them; the stock team keeps the full record. */
  clearMine: () => api.delete<{ cleared: boolean }>("/cart-negotiations/mine"),

  postMessage: (id: string, body: string) =>
    api.post<ApiCartNegotiationMessage>(`/cart-negotiations/${id}/messages`, { body }),

  /** Staff inbox: every customer's thread. */
  list: (query: { page?: number; limit?: number } = {}) =>
    api.get<Paginated<ApiCartNegotiation>>("/cart-negotiations", { query }),
  get: (id: string) => api.get<ApiCartNegotiation>(`/cart-negotiations/${id}`),
};

export const quotesApi = {
  create: (body: { items: { productId: string; areaSqm: number }[]; notes?: string }) =>
    api.post<{ id: string }>("/quotes", body),
  mine: () => api.get<{ id: string; status: string; createdAt: string }[]>("/quotes/mine"),
  list: () => api.get<{ id: string; status: string; createdAt: string }[]>("/quotes"),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch<{ id: string }>(`/quotes/${id}/status`, { status, notes }),
};

// --- Rooms & designs --------------------------------------------------------

export const roomsApi = {
  list: () => api.get<ApiRoom[]>("/rooms"),
  /** Every room template, published or hidden — admin content management only. */
  listAdmin: () => api.get<ApiRoom[]>("/rooms/admin"),
  create: (body: {
    type: RoomType;
    name: string;
    modelUrl: string;
    description?: string;
    thumbnail?: string;
  }) => api.post<ApiRoom>("/rooms", body),
  update: (
    id: string,
    body: Partial<{
      type: RoomType;
      name: string;
      modelUrl: string;
      description: string;
      thumbnail: string;
      isActive: boolean;
    }>,
  ) => api.patch<ApiRoom>(`/rooms/${id}`, body),
  /** Rejected (400) if any saved customer design still uses this room — hide it (`update` with `isActive: false`) instead. */
  remove: (id: string) => api.delete<void>(`/rooms/${id}`),

  saveDesign: (body: {
    roomId: string;
    name: string;
    tiles: { surface: string; productId: string }[];
    previewImageUrl?: string;
    sharedWithSales?: boolean;
  }) => api.post<ApiRoomDesign>("/rooms/designs", body),

  myDesigns: () => api.get<ApiRoomDesign[]>("/rooms/designs/mine"),
  /** Staff: designs customers shared with the sales team — newest first, cursor-paginated, `search` runs on the server. */
  sharedDesigns: (params: { cursor?: string; limit?: number; search?: string } = {}) =>
    api.get<CursorPage<ApiRoomDesign>>("/rooms/designs/shared", { query: params }),
  getDesign: (id: string) => api.get<ApiRoomDesign>(`/rooms/designs/${id}`),
};

// --- Chatbot ----------------------------------------------------------------

export const chatbotApi = {
  sendMessage: (body: {
    sessionId: string;
    content: string;
    conversationId?: string;
    language?: Language;
  }) => api.post<ChatSendResult>("/chatbot/messages", body),

  /** `products`/`decision` are only present on an assistant message that actually recommended something — reattached from `Recommendation.messageId` so a reloaded conversation shows the same cards and like/dislike state, not just the bare text. `attachment` is the same "put this tile on my floor" turn reattached from `ChatMessage.attachments`. */
  history: (conversationId: string) =>
    api.get<
      {
        id: string;
        role: string;
        content: string;
        createdAt: string;
        products?: ChatRecommendation[];
        decision?: RecommendationDecision;
        attachment?: ChatMessageAttachment;
      }[]
    >(`/chatbot/conversations/${conversationId}/messages`),

  /** Starts a brand-new conversation ("project") for the signed-in customer — a fresh session id server-side, so it can never resolve back to an existing one. */
  startConversation: (language?: Language) =>
    api.post<ApiChatConversation>("/chatbot/conversations", { language }),

  /** The signed-in customer's own conversations, most recent first. */
  myConversations: () => api.get<ChatConversationSummary[]>("/chatbot/conversations"),

  /** Admin/marketing: questions customers asked after already receiving a recommendation. Cursor-paginated for infinite scroll — pass the previous page's `nextCursor` back as `cursor` to continue. */
  askedQuestions: (params: { cursor?: string; limit?: number } = {}) =>
    api.get<AskedQuestionsPage>("/chatbot/admin/asked-questions", { query: params }),

  /** Doc 3.6: side-by-side comparison of the selected tiles. */
  compare: (sessionId: string, productIds: string[]) =>
    api.post<{ products: ApiProduct[] }>("/chatbot/compare", { sessionId, productIds }),

  /** Uploads the customer's own room photo first — returns the bare `path` to submit as `roomImagePath` to `roomTilePreview` below, plus a short-lived `url` for an immediate local preview. */
  uploadRoomPhoto: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload<{ bucket: string; path: string; url: string; expiresIn: number; contentType: string; size: number }>(
      "/chatbot/preview/room-photo",
      formData,
    );
  },

  /** Doc 3.6: edits the uploaded room photo to show the picked tile on its floor, and saves both the photo and the result into the conversation. */
  roomTilePreview: (body: { conversationId: string; roomImagePath: string; productId: string; note?: string }) =>
    api.post<{
      userMessage: { id: string; role: "USER"; content: string; createdAt: string; attachment: ChatMessageAttachment };
      assistantMessage: {
        id: string;
        role: "ASSISTANT";
        content: string;
        createdAt: string;
        attachment: ChatMessageAttachment;
      };
    }>("/chatbot/preview/image", body),

  /** Customer feedback on one recommendation — liked, disliked, or cleared back to "no response". */
  setRecommendationDecision: (recommendationId: string, decision: RecommendationDecision) =>
    api.patch<{ id: string; decision: RecommendationDecision }>(`/chatbot/recommendations/${recommendationId}`, {
      decision,
    }),

  /** One reaction to a whole card, saved together or not at all. */
  setRecommendationDecisions: (recommendationIds: string[], decision: RecommendationDecision) =>
    api.patch<{ ids: string[]; decision: RecommendationDecision }>("/chatbot/recommendations", {
      recommendationIds,
      decision,
    }),

  knowledgeBase: () => api.get<ApiKnowledgeBaseEntry[]>("/chatbot/knowledge-base"),
  adminKnowledgeBase: () => api.get<ApiKnowledgeBaseEntry[]>("/chatbot/admin/knowledge-base"),
  createKnowledgeBaseEntry: (body: {
    question: string;
    answer: string;
    tags?: string[];
    language?: Language;
  }) => api.post<ApiKnowledgeBaseEntry>("/chatbot/knowledge-base", body),
  updateKnowledgeBaseEntry: (
    id: string,
    body: Partial<Pick<ApiKnowledgeBaseEntry, "question" | "answer" | "tags" | "language" | "isActive">>,
  ) => api.patch<ApiKnowledgeBaseEntry>(`/chatbot/knowledge-base/${id}`, body),
  deleteKnowledgeBaseEntry: (id: string) => api.delete<void>(`/chatbot/knowledge-base/${id}`),
};

// --- Interaction events (feed the analytics dashboards) ---------------------

export const eventsApi = {
  tile: (body: {
    sessionId: string;
    productId: string;
    type: "VIEWED" | "APPLIED";
    metadata?: Record<string, unknown>;
  }) => api.post<void>("/events/tile", body),

  journey: (body: {
    sessionId: string;
    stage:
      | "OPENED_SYSTEM"
      | "CREATED_ROOM"
      | "ENTERED_DIMENSIONS"
      | "VIEWED_TILE"
      | "APPLIED_TILE";
    metadata?: Record<string, unknown>;
  }) => api.post<void>("/events/journey", body),
};

// --- Settings ---------------------------------------------------------------

export const settingsApi = {
  get: () => api.get<PublicPlatformSettings>("/settings", { anonymous: true }),
  getAdmin: () => api.get<PlatformSettings>("/settings/admin"),
  update: (settings: Record<string, unknown>) => api.patch<PlatformSettings>("/settings", { settings }),

  /** `roomType` here is the single room the customer picked — matches questions that are either always-asked or list that room among their own `roomTypes`. */
  profilingQuestions: (query: { language?: Language; roomType?: RoomType } = {}) =>
    api.get<ProfilingQuestion[]>("/settings/profiling-questions", { query, anonymous: true }),
  createProfilingQuestion: (body: {
    text: string;
    isRequired?: boolean;
    roomTypes?: RoomType[];
    position?: number;
    language?: Language;
  }) => api.post<ProfilingQuestion>("/settings/profiling-questions", body),
  updateProfilingQuestion: (
    id: string,
    body: Partial<{ text: string; isRequired: boolean; roomTypes: RoomType[]; position: number; isActive: boolean }>,
  ) => api.patch<ProfilingQuestion>(`/settings/profiling-questions/${id}`, body),
  reorderProfilingQuestions: (questions: { id: string; position: number }[]) =>
    api.patch<ProfilingQuestion[]>("/settings/profiling-questions/reorder", { questions }),
  deleteProfilingQuestion: (id: string) => api.delete<void>(`/settings/profiling-questions/${id}`),
};

// --- Stock reports ----------------------------------------------------------

export const reportsApi = {
  stockSummary: (period: AnalyticsPeriod = "MONTHLY") =>
    api.get<StockSummary>("/reports/stock/summary", { query: { period } }),

  stockMovements: (
    query: {
      period?: AnalyticsPeriod;
      type?: StockMovementType;
      productId?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => api.get<Paginated<StockMovement>>("/reports/stock/movements", { query }),

  lowStock: () => api.get<LowStockRow[]>("/reports/stock/low-stock"),
  fulfillmentQueue: () => api.get<FulfillmentQueue>("/reports/stock/fulfillment-queue"),
};

// --- Analytics dashboards ---------------------------------------------------

/**
 * Structured around four domains (Customers, Sales, Tiles — incl. AI
 * recommendation performance, since recs are about tiles — and Journey)
 * plus a cross-domain `overview`, not one call per widget. `ADMIN` and
 * `DATA_ANALYST` see every field on every route; `STOCK_MANAGER` gets the
 * same shapes with revenue/order-value figures stripped (see the optional
 * fields on the corresponding types); `SALES_PERSON` can reach `overview`
 * and `sales` only, with the full (untrimmed) figures — their own job is
 * selling. `CLIENT` can reach none of it.
 */
export const analyticsApi = {
  overview: (period: AnalyticsPeriod = "MONTHLY") =>
    api.get<AnalyticsOverview>("/analytics/overview", { query: { period } }),
  customers: (period: AnalyticsPeriod = "MONTHLY") =>
    api.get<CustomerAnalytics>("/analytics/customers", { query: { period } }),
  sales: (period: AnalyticsPeriod = "MONTHLY") =>
    api.get<SalesAnalytics>("/analytics/sales", { query: { period } }),

  tiles: (query: { period?: AnalyticsPeriod; page?: number; limit?: number; search?: string } = {}) =>
    api.get<TileAnalytics>("/analytics/tiles", { query }),
  tileRates: (productId: string) => api.get<TileRates>(`/analytics/tiles/${productId}`),
  tileRecommendations: (
    query: { period?: AnalyticsPeriod; page?: number; limit?: number; search?: string } = {},
  ) => api.get<TileRecommendations>("/analytics/tiles/recommendations", { query }),

  journey: (period: AnalyticsPeriod = "MONTHLY") =>
    api.get<JourneyAnalytics>("/analytics/journey", { query: { period } }),
  journeyStageDetail: (stage: JourneyStage, period: AnalyticsPeriod = "MONTHLY") =>
    api.get<JourneyStageDetail>(`/analytics/journey/${stage}`, { query: { period } }),
};

export const healthApi = {
  check: () => api.get<{ status: string }>("/health", { anonymous: true }),
};

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
  CustomerAnalytics,
  CustomerDetail,
  CustomerSummary,
  DiscoverySource,
  FloorPlanCalculation,
  FulfillmentQueue,
  HearAboutUs,
  JourneyAnalytics,
  Language,
  LowStockRow,
  MarketingAnalysis,
  OrderStatus,
  OrderType,
  OtpSendResult,
  Paginated,
  PlaceOrderResult,
  PlatformSettings,
  ProfilingQuestion,
  QuantityCalculation,
  RecommendationPerformance,
  RecommendationRow,
  Role,
  RoomType,
  SalesAnalytics,
  StaffSummary,
  StockMovement,
  StockMovementType,
  StockSummary,
  SuitableFor,
  TileLeaderboards,
  TilePerformanceTable,
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

  /** Completes registration or logs in; the returned tokens are stored for you. */
  verifyOtp: async (email: string, otp: string) => {
    const tokens = await api.post<AuthTokens>("/auth/verify-otp", { email, otp }, { anonymous: true });
    tokenStore.set(tokens);
    return tokens;
  },

  refresh: (refreshToken: string) =>
    api.post<AuthTokens>("/auth/refresh", { refreshToken }, { anonymous: true }),

  logout: async () => {
    const refreshToken = tokenStore.getRefreshToken();
    if (refreshToken) {
      // A failed revoke must not strand the user in a signed-in UI.
      await api.post<void>("/auth/logout", { refreshToken }, { anonymous: true }).catch(() => undefined);
    }
    tokenStore.clear();
  },
};

// --- Users ------------------------------------------------------------------

export const usersApi = {
  me: () => api.get<ApiUser>("/users/me"),
  updateMe: (body: { fullName?: string; phone?: string; language?: Language }) =>
    api.patch<ApiUser>("/users/me", body),
  closeMyAccount: () => api.delete<ApiUser>("/users/me"),

  listCustomers: (query: { page?: number; limit?: number; search?: string; status?: UserStatus } = {}) =>
    api.get<Paginated<CustomerSummary>>("/users/customers", { query }),
  getCustomer: (id: string) => api.get<CustomerDetail>(`/users/customers/${id}`),

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
};

export const productsApi = {
  list: (query: ProductQuery = {}) => api.get<Paginated<ApiProduct>>("/products", { query }),
  get: (id: string) => api.get<ApiProduct>(`/products/${id}`),

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
  list: () => api.get<{ id: string; productId: string; product: ApiProduct }[]>("/favorites"),
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
  }) => api.post<PlaceOrderResult>("/orders", body),

  list: (
    query: {
      page?: number;
      limit?: number;
      status?: OrderStatus;
      quotationStatus?: string;
      createdByType?: "CUSTOMER" | "STAFF";
      customerId?: string;
    } = {},
  ) => api.get<Paginated<ApiOrder>>("/orders", { query }),

  get: (id: string) => api.get<ApiOrder>(`/orders/${id}`),

  updateStatus: (id: string, status: OrderStatus, note?: string) =>
    api.patch<ApiOrder>(`/orders/${id}/status`, { status, note }),

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

  listMessages: (id: string) => api.get<ApiOrderMessage[]>(`/orders/${id}/messages`),
  postMessage: (id: string, body: string) => api.post<ApiOrderMessage>(`/orders/${id}/messages`, { body }),
};

/**
 * Pre-order negotiations: a cart that couldn't be placed as an order because
 * it exceeds stock on hand. Linked to the customer, not an order — see
 * `ApiCartNegotiation`.
 */
export const cartNegotiationsApi = {
  /** Opens (or continues) the calling customer's thread with a first/next message. */
  submit: (
    items: { productId: string; productName: string; requestedAreaSqm: number; availabilityNote: string }[],
    body: string,
  ) => api.post<ApiCartNegotiation>("/cart-negotiations", { items, body }),

  /** The calling customer's own thread, or `null` if they've never had one. */
  mine: () => api.get<ApiCartNegotiation | null>("/cart-negotiations/mine"),

  /** Deletes the calling customer's own thread entirely — a fresh start, not an archive. */
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
  create: (body: {
    type: RoomType;
    name: string;
    modelUrl: string;
    description?: string;
    thumbnail?: string;
  }) => api.post<ApiRoom>("/rooms", body),

  saveDesign: (body: {
    roomId: string;
    name: string;
    tiles: { surface: string; productId: string }[];
    previewImageUrl?: string;
    sharedWithSales?: boolean;
  }) => api.post<ApiRoomDesign>("/rooms/designs", body),

  myDesigns: () => api.get<ApiRoomDesign[]>("/rooms/designs/mine"),
  sharedDesigns: () => api.get<ApiRoomDesign[]>("/rooms/designs/shared"),
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

  history: (conversationId: string) =>
    api.get<{ id: string; role: string; content: string; createdAt: string }[]>(
      `/chatbot/conversations/${conversationId}/messages`,
    ),

  /** Doc 3.6: side-by-side comparison of the selected tiles. */
  compare: (sessionId: string, productIds: string[]) =>
    api.post<{ products: ApiProduct[] }>("/chatbot/compare", { sessionId, productIds }),

  imagePreview: (body: { conversationId: string; roomImageUrl: string; productIds: string[] }) =>
    api.post<{ id: string; status: string; outputUrl: string | null }>("/chatbot/preview/image", body),

  videoPreview: (body: { conversationId: string; roomVideoUrl: string; productIds: string[] }) =>
    api.post<{ id: string; status: string; outputUrl: string | null }>("/chatbot/preview/video", body),

  knowledgeBase: () => api.get<ApiKnowledgeBaseEntry[]>("/chatbot/knowledge-base"),
  createKnowledgeBaseEntry: (body: {
    question: string;
    answer: string;
    tags?: string[];
    language?: Language;
  }) => api.post<ApiKnowledgeBaseEntry>("/chatbot/knowledge-base", body),
  deleteKnowledgeBaseEntry: (id: string) => api.delete<void>(`/chatbot/knowledge-base/${id}`),
};

// --- Interaction events (feed the analytics dashboards) ---------------------

export const eventsApi = {
  tile: (body: {
    sessionId: string;
    productId: string;
    type: "VIEWED" | "APPLIED" | "COMPARED" | "SAVED" | "SELECTED_FROM_RECOMMENDATION" | "PURCHASED";
    metadata?: Record<string, unknown>;
  }) => api.post<void>("/events/tile", body),

  journey: (body: {
    sessionId: string;
    stage:
      | "OPENED_SYSTEM"
      | "CREATED_ROOM"
      | "ENTERED_DIMENSIONS"
      | "VIEWED_TILE"
      | "APPLIED_TILE"
      | "SAVED_DESIGN"
      | "REQUESTED_QUOTATION"
      | "NEGOTIATED"
      | "PLACED_ORDER"
      | "PURCHASED";
    metadata?: Record<string, unknown>;
  }) => api.post<void>("/events/journey", body),
};

// --- Settings ---------------------------------------------------------------

export const settingsApi = {
  get: () => api.get<PlatformSettings>("/settings", { anonymous: true }),
  update: (settings: Record<string, unknown>) => api.patch<PlatformSettings>("/settings", { settings }),

  profilingQuestions: (query: { language?: Language; roomType?: RoomType } = {}) =>
    api.get<ProfilingQuestion[]>("/settings/profiling-questions", { query, anonymous: true }),
  createProfilingQuestion: (body: {
    text: string;
    isRequired?: boolean;
    roomType?: RoomType;
    position?: number;
    language?: Language;
  }) => api.post<ProfilingQuestion>("/settings/profiling-questions", body),
  updateProfilingQuestion: (
    id: string,
    body: Partial<{ text: string; isRequired: boolean; roomType: RoomType | null; position: number; isActive: boolean }>,
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

export const analyticsApi = {
  overview: (period: AnalyticsPeriod = "MONTHLY") =>
    api.get<AnalyticsOverview>("/analytics/overview", { query: { period } }),
  customers: (period: AnalyticsPeriod = "MONTHLY") =>
    api.get<CustomerAnalytics>("/analytics/customers", { query: { period } }),
  sales: (period: AnalyticsPeriod = "MONTHLY") =>
    api.get<SalesAnalytics>("/analytics/sales", { query: { period } }),
  journey: (period: AnalyticsPeriod = "MONTHLY") =>
    api.get<JourneyAnalytics>("/analytics/journey", { query: { period } }),

  tiles: () => api.get<TileLeaderboards>("/analytics/tiles"),
  tilesTable: (query: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<TilePerformanceTable>("/analytics/tiles/table", { query }),
  tileRates: (productId: string) =>
    api.get<{ selectionRate: number; purchaseConversion: number }>(
      `/analytics/tiles/${productId}/rates`,
    ),

  recommendations: (period: AnalyticsPeriod = "MONTHLY") =>
    api.get<RecommendationPerformance>("/analytics/ai-recommendations", { query: { period } }),
  recommendationsTable: (query: { page?: number; limit?: number; search?: string } = {}) =>
    api.get<Paginated<RecommendationRow>>("/analytics/ai-recommendations/table", { query }),

  marketing: (period: AnalyticsPeriod = "MONTHLY") =>
    api.get<MarketingAnalysis>("/analytics/marketing", { query: { period } }),
};

export const healthApi = {
  check: () => api.get<{ status: string }>("/health", { anonymous: true }),
};

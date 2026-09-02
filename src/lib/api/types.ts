/**
 * Shapes returned by the NestJS API. These mirror `server/src/**` — when a DTO
 * or a Prisma enum changes there, change it here too. Enums use the server's
 * SCREAMING_SNAKE values; the UI maps them to its own labels at the edge rather
 * than sending display strings back over the wire.
 */

// --- Envelope ---------------------------------------------------------------

/** Every successful response is wrapped by the server's TransformInterceptor. */
export type ApiEnvelope<T> = { success: true; data: T };

export type Paginated<T> = {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

// --- Enums ------------------------------------------------------------------

export type Role = "CLIENT" | "SALES_PERSON" | "STOCK_MANAGER" | "DATA_ANALYST" | "ADMIN";
export type Language = "EN" | "RW";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type HearAboutUs =
  | "SOCIAL_MEDIA"
  | "REFERRAL"
  | "ADVERTISEMENT"
  | "SEARCH_ENGINE"
  | "OTHER";
export type SuitableFor = "FLOOR" | "WALL" | "BOTH";
export type RoomType =
  | "LIVING_ROOM"
  | "BEDROOM"
  | "BATHROOM"
  | "KITCHEN"
  | "BALCONY"
  | "STAIRS"
  | "GATES"
  | "OUTDOOR";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type OrderType = "PURCHASE" | "BOOKING";
export type OrderCreatorType = "CUSTOMER" | "STAFF";
export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY_FOR_DISPATCH"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";
export type QuotationStatus =
  | "AWAITING_REVIEW"
  | "QUOTATION_SENT"
  | "PAYMENT_SUBMITTED"
  | "PAYMENT_VERIFIED";
export type OrderMessageAuthor = "SYSTEM" | "CUSTOMER" | "STAFF";
export type PaymentMethod = "MOMO" | "CARD";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
export type StockMovementType = "INBOUND" | "OUTBOUND" | "ADJUSTMENT";
export type TileEventType =
  | "VIEWED"
  | "APPLIED"
  | "COMPARED"
  | "SAVED"
  | "SELECTED_FROM_RECOMMENDATION"
  | "PURCHASED";
export type JourneyStage =
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
export type AnalyticsPeriod = "WEEKLY" | "MONTHLY" | "YEARLY";

// --- Auth & users -----------------------------------------------------------

export type DiscoverySource = { value: HearAboutUs; label: string };

export type ApiUser = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  status: UserStatus;
  language: Language;
  heardAboutUs: HearAboutUs | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = { accessToken: string; refreshToken: string };

/** What `register` / `login` / `otp/resend` return — the code itself never reaches the client. */
export type OtpSendResult = { message: string; expiresInSeconds: number };

export type CustomerSummary = ApiUser & {
  orderCount: number;
  lifetimeSpend: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
};

export type CustomerDetail = CustomerSummary & {
  favoriteCount: number;
  savedDesignCount: number;
  orders: ApiOrder[];
};

export type StaffSummary = {
  byRole: { role: Role; count: number }[];
  total: number;
};

// --- Catalog ----------------------------------------------------------------

export type ApiCollection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image: string | null;
  size: string;
  tileAreaSqm: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  collectionId: string;
  boxCoverageSqm: string;
  piecesPerBox: number;
  price: string;
  currency: string;
  image: string;
  description: string | null;
  suitableFor: SuitableFor;
  roomTypes: RoomType[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Denormalised from the product's collection. */
  size: string;
  tileAreaSqm: number;
  stockStatus: StockStatus;
  /**
   * Staff-only: absent for anonymous and client viewers (doc 3.2). Stock is
   * held and moved in square metres — boxes/pieces are a display conversion
   * only, never the stored quantity.
   */
  quantityOnHandSqm?: number;
  /** Same visibility as `quantityOnHandSqm` — the box/piece conversion of it. */
  onHandBreakdown?: { totalPieces: number; completeBoxes: number; remainingPieces: number };
  /** Same staff-only visibility — the moving weighted-average cost per m², for inventory valuation. Never shown to clients. */
  averageCostPrice?: number;
  /** `quantityOnHandSqm * averageCostPrice` — same visibility as both. */
  inventoryValue?: number;
  /**
   * Cart-line only (`GET /cart`) — not staff-gated like the two fields above.
   * The same exact number this customer is shown anyway the moment they place
   * the order (`CreatedOrder.shortages`), just surfaced a step earlier so the
   * cart can flag *this specific requested quantity* against it live, without
   * a round trip. Absent everywhere else (catalog, product detail, compare).
   */
  availableAreaSqm?: number;
  /** Present when the endpoint nests it (e.g. cart lines) — absent elsewhere, where `size` above already covers it. */
  collection?: { id: string; title: string; slug: string; size: string };
};

export type TileQuantity = {
  requiredArea: number;
  completeBoxes: number;
  boxArea: number;
  remainingArea: number;
  remainingPieces: number;
  totalPieces: number;
  purchasedArea: number;
  tileAreaSqm: number;
  boxCoverageSqm: number;
  piecesPerBox: number;
};

export type QuantityCalculation = TileQuantity & {
  unitPrice: number;
  totalPrice: number;
};

export type FloorPlanCalculation = {
  baseAreaSqm: number;
  wastagePercent: number;
  requiredAreaSqm: number;
  quantity: TileQuantity;
  stockSplit: {
    fromStockPieces: number;
    toSourcePieces: number;
    fullyAvailableFromStock: boolean;
  };
  estimatedCost: number;
  currency: string;
};

// --- Cart, orders, payments -------------------------------------------------

export type ApiCartItem = {
  id: string;
  cartId: string;
  productId: string;
  areaSqm: string;
  createdAt: string;
  product?: ApiProduct;
  /** The same box/piece breakdown `calculateTileQuantity` gives everywhere else — computed server-side from `areaSqm`. */
  quantity: TileQuantity;
  totalPrice: number;
  /** Whether `areaSqm` (once rounded to whole pieces) exceeds `product.availableAreaSqm` — server-computed, so this always tracks the actual saved quantity. */
  exceedsStock: boolean;
};

/** `GET /cart`'s shape — note this is not `{id, userId, ...}`; the cart row itself is just `cartId`. */
export type ApiCart = {
  cartId: string;
  items: ApiCartItem[];
  total: number;
};

/** What `PUT /cart/items` returns — the raw upserted row, no computed fields. Re-fetch `view()` for those. */
export type ApiCartItemRow = {
  id: string;
  cartId: string;
  productId: string;
  areaSqm: string;
  createdAt: string;
};

export type ApiOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  requiredAreaSqm: string;
  boxes: number;
  additionalPieces: number;
  totalPieces: number;
  unitPrice: string;
  totalPrice: string;
  product?: ApiProduct;
};

export type ApiOrderDelivery = {
  id: string;
  orderId: string;
  contactName: string;
  phone: string;
  address: string;
  city: string;
  preferredDate: string | null;
  notes: string | null;
};

export type ApiOrderStatusEvent = {
  id: string;
  orderId: string;
  status: OrderStatus;
  note: string | null;
  createdById: string | null;
  createdAt: string;
};

export type ApiOrderMessage = {
  id: string;
  orderId: string;
  author: OrderMessageAuthor;
  senderId: string | null;
  sender: { id: string; fullName: string; role: Role } | null;
  body: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ApiPayment = {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  currency: string;
  providerRef: string | null;
  createdAt: string;
};

export type ApiOrder = {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  customerId: string;
  createdById: string;
  createdByType: OrderCreatorType;
  subtotal: string;
  total: string;
  currency: string;
  notes: string | null;
  expectedDeliveryAt: string | null;
  deliveredAt: string | null;
  quotationStatus: QuotationStatus;
  transportFee: string | null;
  transportFeeNote: string | null;
  quotationSentAt: string | null;
  /** Set the first time the *customer* opens the quotation (`GET /orders/:id/quotation`) — unlocks marking payment as done. */
  quotationViewedAt: string | null;
  paymentSubmittedAt: string | null;
  paymentVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: ApiOrderItem[];
  statusEvents?: ApiOrderStatusEvent[];
  payments?: ApiPayment[];
  customer?: ApiUser;
  createdBy?: { id: string; fullName: string };
  delivery?: ApiOrderDelivery | null;
};

/** Returned by `POST /orders`: what could not be covered by stock on hand, in m². */
export type StockShortage = {
  productId: string;
  productName: string;
  requestedAreaSqm: number;
  availableAreaSqm: number;
};

export type CreatedOrder = ApiOrder & { shortages: StockShortage[] };

/**
 * A pre-order negotiation: the customer's cart couldn't be covered by stock
 * on hand, so — since no order exists to hang a thread off of — it's linked
 * to the customer instead. Visible to the customer themselves and to staff
 * only (see `cartNegotiationsApi`).
 */
export type ApiCartNegotiationItem = {
  id: string;
  negotiationId: string;
  productId: string;
  productName: string;
  requestedAreaSqm: string;
  /** e.g. "Low stock" or "Out of stock" — whatever the cart showed the customer. */
  availabilityNote: string;
  createdAt: string;
};

export type ApiCartNegotiationMessage = {
  id: string;
  negotiationId: string;
  author: OrderMessageAuthor;
  senderId: string | null;
  sender: { id: string; fullName: string; role: Role } | null;
  body: string;
  createdAt: string;
};

export type ApiCartNegotiation = {
  id: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
  items: ApiCartNegotiationItem[];
  messages: ApiCartNegotiationMessage[];
  customer?: { id: string; fullName: string; email: string | null; phone: string | null };
};

/**
 * `POST /orders` no longer creates an order at all for a customer's own cart
 * when part of it exceeds stock on hand — it opens/continues their
 * `ApiCartNegotiation` instead (seeded with the whole cart, not just the
 * short lines, so staff have full context on the first message). Staff
 * placing an order on a customer's behalf keep the old orderCreated: true
 * path even with a shortage — see `OrdersService.create`.
 */
export type PlaceOrderResult =
  | { orderCreated: true; order: CreatedOrder }
  | { orderCreated: false; negotiation: ApiCartNegotiation };

// --- Rooms & designs --------------------------------------------------------

export type ApiRoom = {
  id: string;
  type: RoomType;
  name: string;
  description: string | null;
  modelUrl: string;
  thumbnail: string | null;
  isActive: boolean;
};

export type ApiRoomDesign = {
  id: string;
  userId: string;
  roomId: string;
  name: string;
  previewImageUrl: string | null;
  sharedWithSales: boolean;
  createdAt: string;
  updatedAt: string;
  room?: ApiRoom;
  user?: ApiUser;
  tiles: { id: string; surface: string; productId: string; product?: ApiProduct }[];
};

// --- Chatbot ----------------------------------------------------------------

export type ChatRecommendation = {
  id: string;
  name: string;
  image: string;
  price: number;
  link: string;
};

export type ChatSendResult = {
  conversation: { id: string; sessionId: string; language: Language };
  message: { id: string; role: "ASSISTANT"; content: string; createdAt: string };
  products: ChatRecommendation[];
};

export type ApiKnowledgeBaseEntry = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  language: Language;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChatMediaJob = {
  id: string;
  conversationId: string;
  type: "IMAGE_PREVIEW" | "VIDEO_PREVIEW";
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  inputUrl: string | null;
  outputUrl: string | null;
  error: string | null;
};

// --- Settings ---------------------------------------------------------------

/** Merged defaults + stored overrides from `GET /settings`. */
export type PlatformSettings = Record<string, unknown> & {
  "platform.name": string;
  "platform.defaultCurrency": string;
  "platform.defaultLanguage": Language;
  "platform.version": string;
  "notifications.lowStockAlerts": boolean;
  "notifications.orderUpdates": boolean;
  "notifications.systemNotifications": boolean;
  "stock.lowStockThreshold": number;
  "payment.momoCode": string;
  "payment.momoName": string;
  "payment.bankName": string;
  "payment.bankAccountName": string;
  "payment.bankAccountNumber": string;
  "payment.bankSwift": string;
  "support.phone": string;
  "support.email": string;
  "support.whatsapp": string;
  "calculator.defaultWastagePercent": number;
};

export type ProfilingQuestion = {
  id: string;
  text: string;
  isRequired: boolean;
  roomType: RoomType | null;
  position: number;
  isActive: boolean;
  language: Language;
};

// --- Reports & analytics ----------------------------------------------------

export type TrendPoint = { label: string; value: number };

export type StockMovement = {
  id: string;
  productId: string;
  /** Square metres — boxes/pieces are a display conversion only, never the stored unit. */
  changeAreaSqm: number;
  type: StockMovementType;
  reference: string | null;
  reason: string;
  createdAt: string;
  product: { id: string; name: string; sku: string };
  adjustedBy: { id: string; fullName: string } | null;
};

export type StockSummary = {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  totalInbound: number;
  totalOutbound: number;
  netChange: number;
  activeProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
  trend: TrendPoint[];
  byType: { type: StockMovementType; movements: number; areaSqm: number }[];
};

export type LowStockRow = {
  productId: string;
  name: string;
  sku: string;
  image: string;
  quantityOnHandSqm: number;
  lowStockThreshold: number;
  stockStatus: StockStatus;
};

export type FulfillmentQueue = {
  byStatus: { status: OrderStatus; count: number }[];
  orders: ApiOrder[];
};

/**
 * `ADMIN`/`DATA_ANALYST`/`STOCK_MANAGER` all get this same full shape.
 * `SALES_PERSON` can reach `overview`/`sales` too (their own screens) with
 * the same full figures — they're the only role limited to those two routes.
 */
export type AnalyticsOverview = {
  period: AnalyticsPeriod;
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  repeatCustomers: number;
  repeatPurchaseRate: number;
  totalRecommendations: number;
  recommendationAcceptanceRate: number;
  averageMatchScore: number;
  activeProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
  revenueTrend: TrendPoint[];
  funnel: { stage: JourneyStage; customers: number }[];
};

export type CustomerAnalytics = {
  period: AnalyticsPeriod;
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  repeatCustomerCount: number;
  repeatPurchaseRate: number;
  byHeardAboutUs: { source: HearAboutUs | null; count: number }[];
  projectTypes: { roomType: RoomType; customers: number; revenue: number }[];
  trend: {
    /** New signups per bucket. */
    newCustomers: TrendPoint[];
    /** Orders per bucket, split by whether each was the placing customer's first order ever or a later (repeat) one. */
    ordersByCustomerType: { new: TrendPoint[]; repeat: TrendPoint[] };
  };
};

/**
 * Period-scoped throughout — `totalSales`/`trend` are the sum/shape of the
 * selected window (7/30/12), not a lifetime figure, so they track the
 * period switcher and support the "vs last period" comparison.
 */
export type SalesAnalytics = {
  period: AnalyticsPeriod;
  totalSales: number;
  previousTotalSales: number;
  percentChangeVsLastPeriod: number;
  totalOrders: number;
  averageOrderValue: number;
  repeatCustomers: number;
  totalCustomers: number;
  repeatPurchaseRate: number;
  byStatus: { status: OrderStatus; count: number; total: number }[];
  byCreator: { createdByType: OrderCreatorType; count: number; total: number }[];
  bestSellingTiles: {
    productId: string;
    name: string;
    image: string | null;
    revenue: number;
    pieces: number;
  }[];
  topPerformer: SalesAnalytics["bestSellingTiles"][number] | null;
  trend: TrendPoint[];
};

export type JourneyAnalytics = {
  period: AnalyticsPeriod;
  stages: {
    stage: JourneyStage;
    customers: number;
    conversionFromPrevious: number;
    dropOffFromPrevious: number;
    dropOffRate: number;
    shareOfEntry: number;
  }[];
  totalSessions: number;
  overallConversionRate: number;
  trend: TrendPoint[];
};

/** One journey-stage drill-down action, normalized regardless of which table it reads from. */
export type JourneyStageAction = {
  id: string;
  userId: string | null;
  type: string;
  summary: string | null;
  createdAt: string;
  detail: unknown;
};

export type JourneyStageDetail = {
  stage: JourneyStage;
  period: AnalyticsPeriod;
  userCount: number;
  users: {
    sessionId: string;
    userId: string | null;
    reachedAt: string;
    metadata: unknown;
    /** `null` for an anonymous session that never signed in. */
    profile: {
      id: string;
      fullName: string;
      email: string | null;
      phone: string | null;
      role: string;
      status: string;
    } | null;
  }[];
  actions: JourneyStageAction[];
};

/**
 * The whole Tile Analytics page in one call: top-10 leaderboards, the
 * platform-wide summary, and the paginated/searchable per-product table —
 * all scoped to the same period.
 */
export type TileAnalytics = {
  period: AnalyticsPeriod;
  leaderboards: {
    mostViewed: { productId: string; name: string; image: string | null; count: number }[];
    mostApplied: { productId: string; name: string; image: string | null; count: number }[];
    mostCompared: { productId: string; name: string; image: string | null; count: number }[];
    mostSaved: { productId: string; name: string; image: string | null; count: number }[];
    mostPurchased: { productId: string; name: string; image: string | null; count: number }[];
  };
  summary: {
    averageSelectionRate: number;
    averagePurchaseConversion: number;
    totalViews: number;
  };
  table: Paginated<TilePerformanceRow>;
};

export type TilePerformanceRow = {
  productId: string;
  name: string;
  sku: string;
  image: string;
  collection: string;
  size: string;
  quantityOnHandSqm: number;
  stockStatus: StockStatus;
  viewed: number;
  applied: number;
  compared: number;
  saved: number;
  purchased: number;
  selectionRate: number;
  purchaseConversion: number;
};

export type TileRates = {
  productId: string;
  viewed: number;
  applied: number;
  purchased: number;
  selectionRate: number;
  purchaseConversion: number;
};

/** The whole AI Analytics page in one call: acceptance/purchase-rate summary + per-product table. */
export type TileRecommendations = {
  period: AnalyticsPeriod;
  summary: {
    displayed: number;
    accepted: number;
    rejected: number;
    purchased: number;
    acceptanceRate: number;
    purchaseRate: number;
    averageMatchScore: number;
    trend: TrendPoint[];
    /** Average match score per bucket — a 0–100 scale, same as `averageMatchScore`. */
    matchScoreTrend: TrendPoint[];
    /** Acceptance rate per bucket, 0–100. */
    acceptanceTrend: TrendPoint[];
  };
  table: Paginated<RecommendationRow>;
};

export type RecommendationRow = {
  productId: string;
  name: string;
  sku: string;
  image: string;
  collection: string;
  size: string;
  quantityOnHandSqm: number;
  stockStatus: StockStatus;
  displayed: number;
  accepted: number;
  acceptanceRate: number;
  averageMatchScore: number;
};

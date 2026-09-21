/**
 * Shapes returned by the NestJS API. These mirror `server/src/**` — when a DTO
 * or a Prisma enum changes there, change it here too. Enums use the server's
 * SCREAMING_SNAKE values; the UI maps them to its own labels at the edge rather
 * than sending display strings back over the wire.
 */

// --- Envelope ---------------------------------------------------------------

/** Every successful response is wrapped by the server's TransformInterceptor. */
export type ApiEnvelope<T> = { success: true; data: T };

/**
 * A keyset-paginated page (`GET /rooms/designs/shared`, `/negotiations/inbox`,
 * `/chatbot/admin/asked-questions`): pass `nextCursor` back as `cursor` for the
 * next one; `null` means that was the last page.
 */
export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

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
/** The rooms the whole app supports — living room, bedroom, bathroom, kitchen. */
export type RoomType = "LIVING_ROOM" | "BEDROOM" | "BATHROOM" | "KITCHEN";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type OrderType = "PURCHASE" | "BOOKING";
export type OrderCreatorType = "CUSTOMER" | "STAFF";
export type OrderStatus =
  | "WAITLISTED"
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

/** What sign-in returns — the refresh token is deliberately absent: it only ever travels as an HttpOnly cookie. */
export type AuthTokens = { accessToken: string };

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
  /** The current page of the orders list below — see `ordersTotal` for how many pages that actually is. */
  orders: ApiOrder[];
  /** Every order regardless of status — what `orders` is actually paginated against, distinct from `orderCount` (spend-counted statuses only). */
  ordersTotal: number;
  ordersPage: number;
  ordersLimit: number;
};

export type StaffSummary = {
  byRole: { role: Role; count: number }[];
  total: number;
};

// --- Catalog ----------------------------------------------------------------

export type ApiCollection = {
  id: string;
  title: string;
  /** Auto-translated Kinyarwanda copy — see `ApiProduct.nameRw`. */
  titleRw: string | null;
  descriptionRw: string | null;
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
  /**
   * Auto-translated Kinyarwanda copy (see the server's `TranslationService`)
   * — `null` until translated (or if translation is disabled), in which
   * case every consumer falls back to `name`/`description`. Never edited
   * directly; re-populated server-side whenever the English text changes.
   */
  nameRw: string | null;
  descriptionRw: string | null;
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
  /**
   * Same staff-only visibility — square metres held by other customers'
   * still-PENDING orders during their payment window (see
   * `availableAreaSqmOf`). `quantityOnHandSqm - reservedAreaSqm` (floored at
   * 0) is what's actually available to sell right now; `stockStatus` above
   * is already computed from that difference, not from `quantityOnHandSqm`
   * alone, so a product can carry real on-hand stock and still show
   * `out_of_stock` — see `staffStockDisplay` for how the staff-facing UI
   * distinguishes that from a genuine shortage.
   */
  reservedAreaSqm?: number;
  /** Same visibility as `quantityOnHandSqm` — the box/piece conversion of it. */
  onHandBreakdown?: { totalPieces: number; completeBoxes: number; remainingPieces: number };
  /** Same staff-only visibility — the moving weighted-average cost per m², for inventory valuation. Never shown to clients. */
  averageCostPrice?: number;
  /** `quantityOnHandSqm * averageCostPrice` — same visibility as both. */
  inventoryValue?: number;
  /** Present when the endpoint nests it (e.g. cart lines) — absent elsewhere, where `size` above already covers it. */
  collection?: { id: string; title: string; titleRw: string | null; slug: string; size: string };
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
  // Qualitative only — the public `/calculator/floor-plan` endpoint never
  // returns exact stock counts (see `calculator.service.ts`).
  stockSplit: {
    fullyAvailableFromStock: boolean;
    partiallyAvailableFromStock: boolean;
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
  /** Whether `areaSqm` (once rounded to whole pieces) exceeds what's available — decided server-side, since the exact available area is staff-only, so this always tracks the actual saved quantity. */
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
  /** What the customer asked for. */
  requiredAreaSqm: string;
  /** What is actually sold and billed: whole pieces, fixed at checkout (so >= requested). */
  purchasedAreaSqm: string;
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
  /** Set while PENDING (this order's items count against `Product.reservedAreaSqm`) — the deadline to complete payment before it's auto-cancelled and released. Null once committed, cancelled, or paid, and while WAITLISTED (nothing is held yet). */
  reservationExpiresAt: string | null;
  /** Set the moment a WAITLISTED order is promoted to PENDING (enough stock finally covers it) — never touched again after that. */
  waitlistPromotedAt: string | null;
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
  /**
   * Exact stock on hand — staff-only (doc 3.2). The server omits it from
   * responses to a customer (order-create, order-message metadata), so it's
   * only present when a staff member is the one reading.
   */
  availableAreaSqm?: number;
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
  /** Auto-translated Kinyarwanda copy — see `ApiProduct.nameRw`. */
  nameRw: string | null;
  descriptionRw: string | null;
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

/** PENDING = no response yet, ACCEPTED = liked, REJECTED = disliked. */
export type RecommendationDecision = "PENDING" | "ACCEPTED" | "REJECTED";

/** The wall half of a bathroom floor+wall combo — same shape as the floor product minus the fields that only make sense once per card (image, matchScore, reason). */
export type ChatRecommendationWallProduct = {
  id: string;
  recommendationId: string;
  name: string;
  price: number;
  link: string;
  collection: string;
  size: string;
};

export type ChatRecommendation = {
  id: string;
  /** The specific `Recommendation` row this pick was persisted as — target this, not `id`, when recording a like/dislike (the same product can be recommended more than once in a conversation). */
  recommendationId: string;
  name: string;
  image: string;
  price: number;
  link: string;
  collection: string;
  size: string;
  /** 0-100 — how well the assistant judged this pick fits what the customer described. */
  matchScore: number;
  /** One concise sentence explaining why the assistant picked this product. */
  reason: string;
  /** Present only for a bathroom recommendation: the wall tile paired with this floor tile in the same generated scene — one card represents the whole floor+wall combo, not two separate recommendations. */
  wallProduct?: ChatRecommendationWallProduct;
};

/**
 * Doc 3.6's "put this tile on my floor" preview — persisted on
 * `ChatMessage.attachments`, so this same shape comes back both from the
 * live `POST /chatbot/preview/image` call and from `GET .../messages` on a
 * later reload (see `ChatbotService.resolveMessageAttachment`).
 */
export type ChatMessageAttachment =
  | { kind: "room-photo"; url: string }
  | {
      kind: "room-tile-preview";
      productId: string;
      productName: string;
      roomImageUrl: string;
      /** `null` when generation failed — the assistant's text says so; there's nothing to render here. */
      generatedImageUrl: string | null;
    };

export type ChatSendResult = {
  conversation: { id: string; sessionId: string; language: Language };
  message: { id: string; role: "ASSISTANT"; content: string; createdAt: string };
  products: ChatRecommendation[];
};

export type ApiChatConversation = {
  id: string;
  userId: string | null;
  sessionId: string;
  language: Language;
  /** Auto-set from the customer's first message — `null` for a brand-new, still-empty conversation. */
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

/** One of the signed-in customer's conversations ("projects"), as listed by `GET /chatbot/conversations` — carries only its most recent message (`messages[0]`), enough for a list preview. */
export type ChatConversationSummary = ApiChatConversation & {
  messages: { id: string; role: "USER" | "ASSISTANT" | "SYSTEM"; content: string; createdAt: string }[];
};

/** A customer question captured for the admin/marketing workspace — every message a customer sent after the assistant had already made a recommendation in that conversation. There's no stored "answer": this logs the question itself, not the assistant's reply to it. */
export type AskedQuestion = {
  id: string;
  conversationId: string;
  userId: string | null;
  messageId: string;
  question: string;
  createdAt: string;
  user: { id: string; fullName: string; email: string | null; phone: string | null } | null;
  conversation: { id: string; sessionId: string; language: Language; title: string | null } | null;
};

/**
 * One row of the staff negotiation inbox (`GET /negotiations/inbox`): who the
 * thread is with, its newest message and message count — never the whole
 * conversation. Fetch that on demand from `GET /orders/:id/messages` (order
 * threads) or `GET /cart-negotiations/:id` (cart threads).
 */
export type NegotiationInboxThread = {
  kind: "order" | "cart";
  id: string;
  /** Order threads only. */
  orderNumber: string | null;
  customer: { id: string; fullName: string; email: string | null };
  messageCount: number;
  lastMessageAt: string;
  lastMessage: { id: string; author: OrderMessageAuthor; senderId: string | null; body: string; createdAt: string };
  /** The newest message wasn't written by staff. */
  awaitingReply: boolean;
};

/** `GET /chatbot/admin/asked-questions` — cursor-paginated for infinite scroll (see the endpoint's own doc). */
export type AskedQuestionsPage = CursorPage<AskedQuestion>;

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
  type: "IMAGE_PREVIEW";
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  inputUrl: string | null;
  outputUrl: string | null;
  error: string | null;
};

// --- Settings ---------------------------------------------------------------

/** Anonymous allow-list returned by `GET /settings`. */
export type PublicPlatformSettings = {
  "platform.name": string;
  "platform.defaultCurrency": string;
  "platform.defaultLanguage": Language;
  "support.phone": string;
  "support.email": string;
  "support.whatsapp": string;
  "calculator.defaultWastagePercent": number;
};

/** Complete admin-only settings returned by `GET /settings/admin`. */
export type PlatformSettings = PublicPlatformSettings & {
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
};

export type ProfilingQuestion = {
  id: string;
  text: string;
  isRequired: boolean;
  /** Empty = always asked. Non-empty = only asked when the customer picked one of these rooms — a question can apply to more than one room type. */
  roomTypes: RoomType[];
  position: number;
  isActive: boolean;
  language: Language;
};

// --- Reports & analytics ----------------------------------------------------

export type TrendPoint = { label: string; value: number };

/** The "Orders by Creator" chart's shape — one point per period bucket, split customer- vs staff-placed. */
export type CreatorTrendPoint = { label: string; customer: number; staff: number };

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
  /** Tile revenue only — never the delivery cost. See `totalTransportFees`. */
  totalSales: number;
  /** Delivery/transport fees earned orders were quoted, kept independent of `totalSales` on purpose. */
  totalTransportFees: number;
  totalOrders: number;
  /** Placed but unpaid. */
  pendingOrders: number;
  /** Paid, not yet shipped. */
  pendingFulfillments: number;
  averageOrderValue: number;
  byCreator: { createdByType: OrderCreatorType; count: number; total: number }[];
  creatorTrend: CreatorTrendPoint[];
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
  /** Tile revenue only — never the delivery cost. See `totalTransportFees`. */
  totalSales: number;
  /** Delivery/transport fees earned orders were quoted, kept independent of `totalSales` on purpose. */
  totalTransportFees: number;
  previousTotalSales: number;
  percentChangeVsLastPeriod: number;
  /** Orders placed in the period. */
  totalOrders: number;
  /** How many of them earned money (payment verified, not cancelled). */
  paidOrders: number;
  /** Waiting for the customer to pay, right now (not per period). */
  unpaidOrders: number;
  averageOrderValue: number;
  repeatCustomers: number;
  totalCustomers: number;
  repeatPurchaseRate: number;
  byStatus: { status: OrderStatus; count: number; total: number }[];
  byCreator: { createdByType: OrderCreatorType; count: number; total: number }[];
  creatorTrend: CreatorTrendPoint[];
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

/**
 * One stage-specific KPI — `key` is a stable identifier the frontend maps to
 * a translated label/icon/format (see `METRIC_META` in the journey page);
 * `value` is raw, never pre-formatted or pre-translated, same as every other
 * analytics endpoint.
 */
export type JourneyStageMetric = { key: string; value: number | string };

export type JourneyStageDetail = {
  stage: JourneyStage;
  period: AnalyticsPeriod;
  userCount: number;
  metrics: JourneyStageMetric[];
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
  /** Actual area sold in the period (sum of earned orders' line items), distinct from `purchased` — see that field's own note. */
  soldAreaSqm: number;
  selectionRate: number;
  purchaseConversion: number;
};

export type TileRates = {
  productId: string;
  viewed: number;
  applied: number;
  compared: number;
  /** Cumulative save/favorite events, presented as likes in the analytics UI. */
  saved: number;
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

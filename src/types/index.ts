import type {
  restaurants,
  categories,
  menuItems,
  tables,
  tableSessions,
  sessionParticipants,
  orders,
  orderItems,
  itemClaims,
  payments,
} from '@/lib/db/schema';

// ============================================================================
// Drizzle infer types
// ============================================================================

export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;

export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;

export type TableSession = typeof tableSessions.$inferSelect;
export type NewTableSession = typeof tableSessions.$inferInsert;

export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type NewSessionParticipant = typeof sessionParticipants.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export type ItemClaim = typeof itemClaims.$inferSelect;
export type NewItemClaim = typeof itemClaims.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// ============================================================================
// API Response types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// Menü — Nested types (API response formatı)
// ============================================================================

export interface MenuItemWithCategory extends MenuItem {
  category: Category;
}

export interface CategoryWithItems extends Category {
  menuItems: MenuItem[];
}

export interface RestaurantMenu {
  restaurant: Restaurant;
  categories: CategoryWithItems[];
}

// ============================================================================
// Session & Split types
// ============================================================================

export interface SessionWithDetails extends TableSession {
  table: Table;
  participants: SessionParticipant[];
  orders: OrderWithItems[];
}

export interface OrderWithItems extends Order {
  items: OrderItemWithClaims[];
}

export interface OrderItemWithClaims extends OrderItem {
  menuItem: MenuItem;
  claims: ItemClaimWithParticipant[];
}

export interface ItemClaimWithParticipant extends ItemClaim {
  participant: SessionParticipant;
}

// ============================================================================
// Split Payment types
// ============================================================================

export type SplitMode = 'equal' | 'by_item' | 'custom';

export interface SplitEqualPayload {
  mode: 'equal';
  sessionId: string;
  participantId: string;
}

export interface SplitByItemPayload {
  mode: 'by_item';
  sessionId: string;
  participantId: string;
  items: {
    orderItemId: string;
    amount: number; // Ürünün tamamı veya bir kısmı
  }[];
}

export interface SplitCustomPayload {
  mode: 'custom';
  sessionId: string;
  participantId: string;
  amount: number;
}

export type SplitPayload =
  | SplitEqualPayload
  | SplitByItemPayload
  | SplitCustomPayload;

// ============================================================================
// WebSocket Event types
// ============================================================================

export interface WSEvents {
  // Client → Server
  joinSession: { sessionToken: string; participantName: string };
  leaveSession: { sessionToken: string };
  claimItem: { orderItemId: string; amount: number };
  unclaimItem: { claimId: string };
  cartUpdate: { items: { menuItemId: string; quantity: number }[] };

  // Server → Client
  participantJoined: { participant: SessionParticipant };
  participantLeft: { participantId: string };
  itemClaimed: { claim: ItemClaim; participantName: string };
  itemUnclaimed: { claimId: string; orderItemId: string };
  orderPlaced: { order: OrderWithItems };
  paymentCompleted: { payment: Payment; participantName: string };
  sessionUpdated: { session: TableSession };
  sessionClosed: { sessionId: string };
}

// ============================================================================
// Payment Gateway types (Interface-based mimari)
// ============================================================================

export interface PaymentParams {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  status: 'completed' | 'failed' | 'pending';
  gatewayResponse: Record<string, unknown>;
  message?: string;
}

export interface PaymentStatus {
  transactionId: string;
  status: 'completed' | 'failed' | 'pending' | 'refunded';
  amount: number;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  message?: string;
}

export interface PaymentGateway {
  createPayment(params: PaymentParams): Promise<PaymentResult>;
  checkStatus(transactionId: string): Promise<PaymentStatus>;
  refund(transactionId: string, amount: number): Promise<RefundResult>;
}

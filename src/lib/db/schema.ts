import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const tableStatusEnum = pgEnum('table_status', [
  'available',
  'occupied',
  'reserved',
  'maintenance',
]);

export const sessionStatusEnum = pgEnum('session_status', [
  'active',
  'payment_pending',
  'closed',
  'cancelled',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'cancelled',
]);

export const orderItemStatusEnum = pgEnum('order_item_status', [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'cancelled',
]);

export const claimStatusEnum = pgEnum('claim_status', [
  'pending',
  'locked',
  'paid',
  'cancelled',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'credit_card',
  'debit_card',
  'cash',
  'wallet',
  'split_equal',
  'split_item',
  'split_custom',
]);

export const userRoleEnum = pgEnum('user_role', [
  'owner',
  'admin',
  'waiter',
  'kitchen',
  'cashier',
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Restoranlar — Platformdaki her restoran/kafe
 */
export const restaurants = pgTable('restaurants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  logoUrl: text('logo_url'),
  coverImageUrl: text('cover_image_url'),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  currency: varchar('currency', { length: 3 }).notNull().default('TRY'),
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Kullanıcılar — Restoran personeli (Garson, Mutfak, Admin vs.)
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id')
    .notNull()
    .references(() => restaurants.id, { onDelete: 'cascade' }),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('waiter'),
  isActive: boolean('is_active').notNull().default(true),
  name: varchar('name', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Kategoriler — Menü kategorileri (Başlangıçlar, Ana Yemekler, İçecekler...)
 */
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id')
    .notNull()
    .references(() => restaurants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  iconEmoji: varchar('icon_emoji', { length: 10 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Menü Ürünleri — Restoran menüsündeki yemek/içecekler
 */
export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('image_url'),
  isAvailable: boolean('is_available').notNull().default(true),
  maxQuantity: integer('max_quantity'), // Bir oturumda maksimum kaç adet sipariş edilebilir
  preparationTime: integer('preparation_time'),
  allergens: text('allergens'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Masalar — Fiziksel restoran masaları
 * Her masanın bir QR token'ı vardır (süreli, güvenli UUID)
 */
export const tables = pgTable('tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id')
    .notNull()
    .references(() => restaurants.id, { onDelete: 'cascade' }),
  tableNumber: integer('table_number').notNull(),
  label: varchar('label', { length: 50 }), // "Bahçe 1", "VIP", "Teras 3"
  capacity: integer('capacity').notNull().default(4),
  status: tableStatusEnum('status').notNull().default('available'),
  currentToken: varchar('current_token', { length: 64 }).unique(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  qrCodeUrl: text('qr_code_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Masa Oturumları — Her masa açılışı/kapanışı bir session oluşturur
 * Hesap bölme, ödeme ve sipariş takibinin bağlandığı ana kayıt
 */
export const tableSessions = pgTable('table_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableId: uuid('table_id')
    .notNull()
    .references(() => tables.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 64 }).notNull().unique(),
  status: sessionStatusEnum('status').notNull().default('active'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  paidAmount: numeric('paid_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  guestCount: integer('guest_count').notNull().default(1),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

/**
 * Oturum Katılımcıları — Masaya QR ile katılan her kullanıcı
 * Kayıt gerektirmez, sadece bir display name + device fingerprint
 */
export const sessionParticipants = pgTable('session_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => tableSessions.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  avatarEmoji: varchar('avatar_emoji', { length: 10 }).default('👤'),
  deviceFingerprint: varchar('device_fingerprint', { length: 255 }),
  sessionToken: varchar('session_token', { length: 128 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Siparişler — Sipariş grupları
 */
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => tableSessions.id, { onDelete: 'cascade' }),
  participantId: uuid('participant_id')
    .references(() => sessionParticipants.id, { onDelete: 'set null' }),
  status: orderStatusEnum('status').notNull().default('pending'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Sipariş Kalemleri — Her siparişin içindeki ürünler
 */
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: uuid('menu_item_id')
    .notNull()
    .references(() => menuItems.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull().default(1),
  paidQuantity: integer('paid_quantity').notNull().default(0),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'), // "Az acılı", "Soslu" gibi notlar
  status: orderItemStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Ürün Sahiplenme (Claims) — Hesap bölme mantığının kalbi
 * Kim hangi ürünü ne kadar tutarla üstleniyor?
 * Race condition'ı önlemek için transaction + FOR UPDATE kullanılır
 */
export const itemClaims = pgTable('item_claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderItemId: uuid('order_item_id')
    .notNull()
    .references(() => orderItems.id, { onDelete: 'cascade' }),
  participantId: uuid('participant_id')
    .notNull()
    .references(() => sessionParticipants.id, { onDelete: 'cascade' }),
  claimedAmount: numeric('claimed_amount', { precision: 10, scale: 2 }).notNull(),
  status: claimStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Ödemeler — Her ödeme kaydı (mock veya gerçek gateway)
 * Interface-based mimari ile farklı ödeme sistemlerine geçiş kolaylığı
 */
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => tableSessions.id, { onDelete: 'cascade' }),
  participantId: uuid('participant_id')
    .notNull()
    .references(() => sessionParticipants.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  transactionId: varchar('transaction_id', { length: 255 }),
  gatewayResponse: jsonb('gateway_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  categories: many(categories),
  tables: many(tables),
  users: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [users.restaurantId],
    references: [restaurants.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [categories.restaurantId],
    references: [restaurants.id],
  }),
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [tables.restaurantId],
    references: [restaurants.id],
  }),
  sessions: many(tableSessions),
}));

export const tableSessionsRelations = relations(tableSessions, ({ one, many }) => ({
  table: one(tables, {
    fields: [tableSessions.tableId],
    references: [tables.id],
  }),
  participants: many(sessionParticipants),
  orders: many(orders),
  payments: many(payments),
}));

export const sessionParticipantsRelations = relations(sessionParticipants, ({ one, many }) => ({
  session: one(tableSessions, {
    fields: [sessionParticipants.sessionId],
    references: [tableSessions.id],
  }),
  orders: many(orders),
  claims: many(itemClaims),
  payments: many(payments),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  session: one(tableSessions, {
    fields: [orders.sessionId],
    references: [tableSessions.id],
  }),
  participant: one(sessionParticipants, {
    fields: [orders.participantId],
    references: [sessionParticipants.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
  claims: many(itemClaims),
}));

export const itemClaimsRelations = relations(itemClaims, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [itemClaims.orderItemId],
    references: [orderItems.id],
  }),
  participant: one(sessionParticipants, {
    fields: [itemClaims.participantId],
    references: [sessionParticipants.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  session: one(tableSessions, {
    fields: [payments.sessionId],
    references: [tableSessions.id],
  }),
  participant: one(sessionParticipants, {
    fields: [payments.participantId],
    references: [sessionParticipants.id],
  }),
}));

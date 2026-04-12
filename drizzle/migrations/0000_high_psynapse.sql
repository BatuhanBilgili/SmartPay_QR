CREATE TYPE "public"."claim_status" AS ENUM('pending', 'locked', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_item_status" AS ENUM('pending', 'confirmed', 'preparing', 'served', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'preparing', 'served', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('credit_card', 'debit_card', 'cash', 'wallet', 'split_equal', 'split_item', 'split_custom');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'payment_pending', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."table_status" AS ENUM('available', 'occupied', 'reserved', 'maintenance');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon_emoji" varchar(10),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"claimed_amount" numeric(10, 2) NOT NULL,
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"image_url" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"preparation_time" integer,
	"allergens" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"notes" text,
	"status" "order_item_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"participant_id" uuid,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"transaction_id" varchar(255),
	"gateway_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"logo_url" text,
	"cover_image_url" text,
	"address" text,
	"phone" varchar(20),
	"currency" varchar(3) DEFAULT 'TRY' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"avatar_emoji" varchar(10) DEFAULT '👤',
	"device_fingerprint" varchar(255),
	"session_token" varchar(128) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_participants_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "table_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"guest_count" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "table_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"table_number" integer NOT NULL,
	"label" varchar(50),
	"capacity" integer DEFAULT 4 NOT NULL,
	"status" "table_status" DEFAULT 'available' NOT NULL,
	"current_token" varchar(64),
	"token_expires_at" timestamp with time zone,
	"qr_code_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tables_current_token_unique" UNIQUE("current_token")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_claims" ADD CONSTRAINT "item_claims_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_claims" ADD CONSTRAINT "item_claims_participant_id_session_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."session_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_participant_id_session_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."session_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_participant_id_session_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."session_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;
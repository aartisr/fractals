import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('user', 'moderator', 'admin');
  CREATE TYPE "public"."enum_video_views_device_type" AS ENUM('desktop', 'mobile', 'tablet', 'unknown');
  CREATE TYPE "public"."enum_subscription_plans_interval" AS ENUM('monthly', 'yearly');
  CREATE TYPE "public"."enum_user_subscriptions_status" AS ENUM('active', 'cancelled', 'non-renewing', 'expired');
  CREATE TYPE "public"."enum_subscription_transactions_status" AS ENUM('success', 'failed', 'pending');
  CREATE TYPE "public"."enum_superchat_messages_tier" AS ENUM('blue', 'gold', 'orange', 'pink', 'red');
  CREATE TYPE "public"."enum_superchat_messages_status" AS ENUM('pending', 'success', 'failed', 'refunded');
  CREATE TYPE "public"."enum_superchat_tiers_tier_id" AS ENUM('blue', 'gold', 'orange', 'pink', 'red');
  CREATE TYPE "public"."enum_payment_events_event_source" AS ENUM('paystack', 'system', 'admin');
  CREATE TABLE "video_views" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" varchar NOT NULL,
  	"video_id" integer NOT NULL,
  	"ecitizen_id" integer,
  	"viewer_name" varchar,
  	"ip_address" varchar,
  	"user_agent" varchar,
  	"device_type" "enum_video_views_device_type",
  	"country" varchar,
  	"quality" varchar,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"ended_at" timestamp(3) with time zone,
  	"last_heartbeat_at" timestamp(3) with time zone,
  	"watch_duration_seconds" numeric,
  	"progress_percentage" numeric,
  	"completed" boolean DEFAULT false,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subscription_plans_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"feature" varchar NOT NULL
  );
  
  CREATE TABLE "subscription_plans" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"interval" "enum_subscription_plans_interval" DEFAULT 'monthly' NOT NULL,
  	"amount" numeric NOT NULL,
  	"currency" varchar DEFAULT 'USD' NOT NULL,
  	"paystack_plan_code" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"display_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "user_subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user" varchar NOT NULL,
  	"plan_id" integer NOT NULL,
  	"paystack_subscription_code" varchar,
  	"paystack_customer_code" varchar,
  	"paystack_authorization_code" varchar,
  	"paystack_email_token" varchar,
  	"status" "enum_user_subscriptions_status" DEFAULT 'active' NOT NULL,
  	"current_period_start" timestamp(3) with time zone,
  	"current_period_end" timestamp(3) with time zone,
  	"next_payment_date" timestamp(3) with time zone,
  	"cancelled_at" timestamp(3) with time zone,
  	"last4" varchar,
  	"card_type" varchar,
  	"card_bank" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subscription_transactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subscription_id" integer NOT NULL,
  	"user" varchar NOT NULL,
  	"transaction_reference" varchar NOT NULL,
  	"amount" numeric NOT NULL,
  	"status" "enum_subscription_transactions_status" NOT NULL,
  	"paystack_transaction_id" numeric,
  	"paystack_response" jsonb,
  	"gateway_response" varchar,
  	"fees" numeric,
  	"net_amount" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "user_payment_methods" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user" varchar NOT NULL,
  	"authorization_code" varchar NOT NULL,
  	"last4" varchar NOT NULL,
  	"exp_month" varchar,
  	"exp_year" varchar,
  	"card_type" varchar,
  	"bank" varchar,
  	"brand" varchar,
  	"is_default" boolean DEFAULT false,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "superchat_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user" varchar NOT NULL,
  	"stream_id" integer NOT NULL,
  	"message" varchar NOT NULL,
  	"amount" numeric NOT NULL,
  	"currency" varchar DEFAULT 'USD' NOT NULL,
  	"highlight_color" varchar,
  	"pin_duration_seconds" numeric,
  	"tier" "enum_superchat_messages_tier",
  	"transaction_reference" varchar,
  	"paystack_authorization_code" varchar,
  	"status" "enum_superchat_messages_status" DEFAULT 'pending' NOT NULL,
  	"is_visible" boolean DEFAULT true,
  	"is_pinned" boolean DEFAULT false,
  	"pinned_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "superchat_tiers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"tier_id" "enum_superchat_tiers_tier_id" NOT NULL,
  	"min_amount" numeric NOT NULL,
  	"color" varchar NOT NULL,
  	"pin_duration" numeric DEFAULT 30 NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"display_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payment_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_type" varchar NOT NULL,
  	"event_source" "enum_payment_events_event_source" DEFAULT 'paystack' NOT NULL,
  	"user" varchar,
  	"subscription_id" integer,
  	"superchat_id" integer,
  	"paystack_event" varchar,
  	"paystack_payload" jsonb,
  	"processed" boolean DEFAULT false,
  	"processed_at" timestamp(3) with time zone,
  	"error_message" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'user' NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "video_views_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "subscription_plans_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "user_subscriptions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "subscription_transactions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "user_payment_methods_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "superchat_messages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "superchat_tiers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payment_events_id" integer;
  ALTER TABLE "video_views" ADD CONSTRAINT "video_views_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "video_views" ADD CONSTRAINT "video_views_ecitizen_id_ecitizen_id_fk" FOREIGN KEY ("ecitizen_id") REFERENCES "public"."ecitizen"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subscription_plans_features" ADD CONSTRAINT "subscription_plans_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subscription_transactions" ADD CONSTRAINT "subscription_transactions_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "superchat_messages" ADD CONSTRAINT "superchat_messages_stream_id_live_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."live_streams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_superchat_id_superchat_messages_id_fk" FOREIGN KEY ("superchat_id") REFERENCES "public"."superchat_messages"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "video_views_session_id_idx" ON "video_views" USING btree ("session_id");
  CREATE INDEX "video_views_video_idx" ON "video_views" USING btree ("video_id");
  CREATE INDEX "video_views_ecitizen_idx" ON "video_views" USING btree ("ecitizen_id");
  CREATE INDEX "video_views_started_at_idx" ON "video_views" USING btree ("started_at");
  CREATE INDEX "video_views_last_heartbeat_at_idx" ON "video_views" USING btree ("last_heartbeat_at");
  CREATE INDEX "video_views_is_active_idx" ON "video_views" USING btree ("is_active");
  CREATE INDEX "video_views_updated_at_idx" ON "video_views" USING btree ("updated_at");
  CREATE INDEX "video_views_created_at_idx" ON "video_views" USING btree ("created_at");
  CREATE INDEX "subscription_plans_features_order_idx" ON "subscription_plans_features" USING btree ("_order");
  CREATE INDEX "subscription_plans_features_parent_id_idx" ON "subscription_plans_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "subscription_plans_paystack_plan_code_idx" ON "subscription_plans" USING btree ("paystack_plan_code");
  CREATE INDEX "subscription_plans_updated_at_idx" ON "subscription_plans" USING btree ("updated_at");
  CREATE INDEX "subscription_plans_created_at_idx" ON "subscription_plans" USING btree ("created_at");
  CREATE INDEX "user_subscriptions_plan_idx" ON "user_subscriptions" USING btree ("plan_id");
  CREATE UNIQUE INDEX "user_subscriptions_paystack_subscription_code_idx" ON "user_subscriptions" USING btree ("paystack_subscription_code");
  CREATE INDEX "user_subscriptions_updated_at_idx" ON "user_subscriptions" USING btree ("updated_at");
  CREATE INDEX "user_subscriptions_created_at_idx" ON "user_subscriptions" USING btree ("created_at");
  CREATE INDEX "subscription_transactions_subscription_idx" ON "subscription_transactions" USING btree ("subscription_id");
  CREATE UNIQUE INDEX "subscription_transactions_transaction_reference_idx" ON "subscription_transactions" USING btree ("transaction_reference");
  CREATE INDEX "subscription_transactions_updated_at_idx" ON "subscription_transactions" USING btree ("updated_at");
  CREATE INDEX "subscription_transactions_created_at_idx" ON "subscription_transactions" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_payment_methods_authorization_code_idx" ON "user_payment_methods" USING btree ("authorization_code");
  CREATE INDEX "user_payment_methods_updated_at_idx" ON "user_payment_methods" USING btree ("updated_at");
  CREATE INDEX "user_payment_methods_created_at_idx" ON "user_payment_methods" USING btree ("created_at");
  CREATE INDEX "superchat_messages_stream_idx" ON "superchat_messages" USING btree ("stream_id");
  CREATE UNIQUE INDEX "superchat_messages_transaction_reference_idx" ON "superchat_messages" USING btree ("transaction_reference");
  CREATE INDEX "superchat_messages_updated_at_idx" ON "superchat_messages" USING btree ("updated_at");
  CREATE INDEX "superchat_messages_created_at_idx" ON "superchat_messages" USING btree ("created_at");
  CREATE UNIQUE INDEX "superchat_tiers_tier_id_idx" ON "superchat_tiers" USING btree ("tier_id");
  CREATE INDEX "superchat_tiers_updated_at_idx" ON "superchat_tiers" USING btree ("updated_at");
  CREATE INDEX "superchat_tiers_created_at_idx" ON "superchat_tiers" USING btree ("created_at");
  CREATE INDEX "payment_events_subscription_idx" ON "payment_events" USING btree ("subscription_id");
  CREATE INDEX "payment_events_superchat_idx" ON "payment_events" USING btree ("superchat_id");
  CREATE INDEX "payment_events_updated_at_idx" ON "payment_events" USING btree ("updated_at");
  CREATE INDEX "payment_events_created_at_idx" ON "payment_events" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_video_views_fk" FOREIGN KEY ("video_views_id") REFERENCES "public"."video_views"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscription_plans_fk" FOREIGN KEY ("subscription_plans_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_user_subscriptions_fk" FOREIGN KEY ("user_subscriptions_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscription_transactions_fk" FOREIGN KEY ("subscription_transactions_id") REFERENCES "public"."subscription_transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_user_payment_methods_fk" FOREIGN KEY ("user_payment_methods_id") REFERENCES "public"."user_payment_methods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_superchat_messages_fk" FOREIGN KEY ("superchat_messages_id") REFERENCES "public"."superchat_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_superchat_tiers_fk" FOREIGN KEY ("superchat_tiers_id") REFERENCES "public"."superchat_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_events_fk" FOREIGN KEY ("payment_events_id") REFERENCES "public"."payment_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_video_views_id_idx" ON "payload_locked_documents_rels" USING btree ("video_views_id");
  CREATE INDEX "payload_locked_documents_rels_subscription_plans_id_idx" ON "payload_locked_documents_rels" USING btree ("subscription_plans_id");
  CREATE INDEX "payload_locked_documents_rels_user_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("user_subscriptions_id");
  CREATE INDEX "payload_locked_documents_rels_subscription_transactions__idx" ON "payload_locked_documents_rels" USING btree ("subscription_transactions_id");
  CREATE INDEX "payload_locked_documents_rels_user_payment_methods_id_idx" ON "payload_locked_documents_rels" USING btree ("user_payment_methods_id");
  CREATE INDEX "payload_locked_documents_rels_superchat_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("superchat_messages_id");
  CREATE INDEX "payload_locked_documents_rels_superchat_tiers_id_idx" ON "payload_locked_documents_rels" USING btree ("superchat_tiers_id");
  CREATE INDEX "payload_locked_documents_rels_payment_events_id_idx" ON "payload_locked_documents_rels" USING btree ("payment_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "video_views" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "subscription_plans_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "subscription_plans" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "user_subscriptions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "subscription_transactions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "user_payment_methods" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "superchat_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "superchat_tiers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payment_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "video_views" CASCADE;
  DROP TABLE "subscription_plans_features" CASCADE;
  DROP TABLE "subscription_plans" CASCADE;
  DROP TABLE "user_subscriptions" CASCADE;
  DROP TABLE "subscription_transactions" CASCADE;
  DROP TABLE "user_payment_methods" CASCADE;
  DROP TABLE "superchat_messages" CASCADE;
  DROP TABLE "superchat_tiers" CASCADE;
  DROP TABLE "payment_events" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_video_views_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_subscription_plans_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_user_subscriptions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_subscription_transactions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_user_payment_methods_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_superchat_messages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_superchat_tiers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payment_events_fk";
  
  DROP INDEX "payload_locked_documents_rels_video_views_id_idx";
  DROP INDEX "payload_locked_documents_rels_subscription_plans_id_idx";
  DROP INDEX "payload_locked_documents_rels_user_subscriptions_id_idx";
  DROP INDEX "payload_locked_documents_rels_subscription_transactions__idx";
  DROP INDEX "payload_locked_documents_rels_user_payment_methods_id_idx";
  DROP INDEX "payload_locked_documents_rels_superchat_messages_id_idx";
  DROP INDEX "payload_locked_documents_rels_superchat_tiers_id_idx";
  DROP INDEX "payload_locked_documents_rels_payment_events_id_idx";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "video_views_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "subscription_plans_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "user_subscriptions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "subscription_transactions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "user_payment_methods_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "superchat_messages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "superchat_tiers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payment_events_id";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_video_views_device_type";
  DROP TYPE "public"."enum_subscription_plans_interval";
  DROP TYPE "public"."enum_user_subscriptions_status";
  DROP TYPE "public"."enum_subscription_transactions_status";
  DROP TYPE "public"."enum_superchat_messages_tier";
  DROP TYPE "public"."enum_superchat_messages_status";
  DROP TYPE "public"."enum_superchat_tiers_tier_id";
  DROP TYPE "public"."enum_payment_events_event_source";`)
}

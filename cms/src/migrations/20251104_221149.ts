import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_live_chat_type" AS ENUM('user', 'system', 'moderator');
  CREATE TABLE "ecitizen" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"display_name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "live_chat" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" varchar NOT NULL,
  	"ecitizen_id" integer NOT NULL,
  	"stream_id" integer NOT NULL,
  	"type" "enum_live_chat_type" DEFAULT 'user' NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ecitizen_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "live_chat_id" integer;
  ALTER TABLE "live_chat" ADD CONSTRAINT "live_chat_ecitizen_id_ecitizen_id_fk" FOREIGN KEY ("ecitizen_id") REFERENCES "public"."ecitizen"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_chat" ADD CONSTRAINT "live_chat_stream_id_live_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."live_streams"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "ecitizen_email_idx" ON "ecitizen" USING btree ("email");
  CREATE INDEX "ecitizen_updated_at_idx" ON "ecitizen" USING btree ("updated_at");
  CREATE INDEX "ecitizen_created_at_idx" ON "ecitizen" USING btree ("created_at");
  CREATE INDEX "live_chat_ecitizen_idx" ON "live_chat" USING btree ("ecitizen_id");
  CREATE INDEX "live_chat_stream_idx" ON "live_chat" USING btree ("stream_id");
  CREATE INDEX "live_chat_updated_at_idx" ON "live_chat" USING btree ("updated_at");
  CREATE INDEX "live_chat_created_at_idx" ON "live_chat" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ecitizen_fk" FOREIGN KEY ("ecitizen_id") REFERENCES "public"."ecitizen"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_live_chat_fk" FOREIGN KEY ("live_chat_id") REFERENCES "public"."live_chat"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ecitizen_id_idx" ON "payload_locked_documents_rels" USING btree ("ecitizen_id");
  CREATE INDEX "payload_locked_documents_rels_live_chat_id_idx" ON "payload_locked_documents_rels" USING btree ("live_chat_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ecitizen" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "live_chat" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ecitizen" CASCADE;
  DROP TABLE "live_chat" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ecitizen_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_live_chat_fk";
  
  DROP INDEX "payload_locked_documents_rels_ecitizen_id_idx";
  DROP INDEX "payload_locked_documents_rels_live_chat_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ecitizen_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "live_chat_id";
  DROP TYPE "public"."enum_live_chat_type";`)
}

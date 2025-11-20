import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_live_stream_views_device_type" AS ENUM('desktop', 'mobile', 'tablet', 'unknown');
  CREATE TABLE "live_stream_views" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" varchar NOT NULL,
  	"stream_id" integer NOT NULL,
  	"ecitizen_id" integer,
  	"viewer_name" varchar,
  	"ip_address" varchar,
  	"user_agent" varchar,
  	"device_type" "enum_live_stream_views_device_type",
  	"country" varchar,
  	"quality" varchar,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"ended_at" timestamp(3) with time zone,
  	"last_heartbeat_at" timestamp(3) with time zone,
  	"watch_duration_seconds" numeric,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "transcripts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stream_id" integer NOT NULL,
  	"language" varchar DEFAULT 'en' NOT NULL,
  	"version" numeric DEFAULT 0 NOT NULL,
  	"is_final" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "transcript_segments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"transcript_id" integer NOT NULL,
  	"start_ms" numeric NOT NULL,
  	"end_ms" numeric NOT NULL,
  	"text" varchar NOT NULL,
  	"rev" numeric DEFAULT 1 NOT NULL,
  	"is_stable" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audio_chunks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stream_id" integer NOT NULL,
  	"start_ms" numeric NOT NULL,
  	"end_ms" numeric NOT NULL,
  	"file_path" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "live_streams" ADD COLUMN "started_at" timestamp(3) with time zone;
  ALTER TABLE "live_streams" ADD COLUMN "transcription_enabled" boolean DEFAULT false;
  ALTER TABLE "live_streams" ADD COLUMN "transcription_language" varchar DEFAULT 'en';
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "live_stream_views_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "transcripts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "transcript_segments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audio_chunks_id" integer;
  ALTER TABLE "live_stream_views" ADD CONSTRAINT "live_stream_views_stream_id_live_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."live_streams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "live_stream_views" ADD CONSTRAINT "live_stream_views_ecitizen_id_ecitizen_id_fk" FOREIGN KEY ("ecitizen_id") REFERENCES "public"."ecitizen"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_stream_id_live_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."live_streams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_transcript_id_transcripts_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcripts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audio_chunks" ADD CONSTRAINT "audio_chunks_stream_id_live_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."live_streams"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "live_stream_views_session_id_idx" ON "live_stream_views" USING btree ("session_id");
  CREATE INDEX "live_stream_views_stream_idx" ON "live_stream_views" USING btree ("stream_id");
  CREATE INDEX "live_stream_views_ecitizen_idx" ON "live_stream_views" USING btree ("ecitizen_id");
  CREATE INDEX "live_stream_views_started_at_idx" ON "live_stream_views" USING btree ("started_at");
  CREATE INDEX "live_stream_views_last_heartbeat_at_idx" ON "live_stream_views" USING btree ("last_heartbeat_at");
  CREATE INDEX "live_stream_views_is_active_idx" ON "live_stream_views" USING btree ("is_active");
  CREATE INDEX "live_stream_views_updated_at_idx" ON "live_stream_views" USING btree ("updated_at");
  CREATE INDEX "live_stream_views_created_at_idx" ON "live_stream_views" USING btree ("created_at");
  CREATE INDEX "transcripts_stream_idx" ON "transcripts" USING btree ("stream_id");
  CREATE INDEX "transcripts_updated_at_idx" ON "transcripts" USING btree ("updated_at");
  CREATE INDEX "transcripts_created_at_idx" ON "transcripts" USING btree ("created_at");
  CREATE INDEX "transcript_segments_transcript_idx" ON "transcript_segments" USING btree ("transcript_id");
  CREATE INDEX "transcript_segments_updated_at_idx" ON "transcript_segments" USING btree ("updated_at");
  CREATE INDEX "transcript_segments_created_at_idx" ON "transcript_segments" USING btree ("created_at");
  CREATE INDEX "audio_chunks_stream_idx" ON "audio_chunks" USING btree ("stream_id");
  CREATE INDEX "audio_chunks_updated_at_idx" ON "audio_chunks" USING btree ("updated_at");
  CREATE INDEX "audio_chunks_created_at_idx" ON "audio_chunks" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_live_stream_views_fk" FOREIGN KEY ("live_stream_views_id") REFERENCES "public"."live_stream_views"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transcripts_fk" FOREIGN KEY ("transcripts_id") REFERENCES "public"."transcripts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transcript_segments_fk" FOREIGN KEY ("transcript_segments_id") REFERENCES "public"."transcript_segments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audio_chunks_fk" FOREIGN KEY ("audio_chunks_id") REFERENCES "public"."audio_chunks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_live_stream_views_id_idx" ON "payload_locked_documents_rels" USING btree ("live_stream_views_id");
  CREATE INDEX "payload_locked_documents_rels_transcripts_id_idx" ON "payload_locked_documents_rels" USING btree ("transcripts_id");
  CREATE INDEX "payload_locked_documents_rels_transcript_segments_id_idx" ON "payload_locked_documents_rels" USING btree ("transcript_segments_id");
  CREATE INDEX "payload_locked_documents_rels_audio_chunks_id_idx" ON "payload_locked_documents_rels" USING btree ("audio_chunks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "live_stream_views" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "transcripts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "transcript_segments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audio_chunks" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "live_stream_views" CASCADE;
  DROP TABLE "transcripts" CASCADE;
  DROP TABLE "transcript_segments" CASCADE;
  DROP TABLE "audio_chunks" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_live_stream_views_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_transcripts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_transcript_segments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audio_chunks_fk";
  
  DROP INDEX "payload_locked_documents_rels_live_stream_views_id_idx";
  DROP INDEX "payload_locked_documents_rels_transcripts_id_idx";
  DROP INDEX "payload_locked_documents_rels_transcript_segments_id_idx";
  DROP INDEX "payload_locked_documents_rels_audio_chunks_id_idx";
  ALTER TABLE "live_streams" DROP COLUMN "started_at";
  ALTER TABLE "live_streams" DROP COLUMN "transcription_enabled";
  ALTER TABLE "live_streams" DROP COLUMN "transcription_language";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "live_stream_views_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "transcripts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "transcript_segments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audio_chunks_id";
  DROP TYPE "public"."enum_live_stream_views_device_type";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "live_streams_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "live_streams_texts" ADD CONSTRAINT "live_streams_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."live_streams"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "live_streams_texts_order_parent_idx" ON "live_streams_texts" USING btree ("order","parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "live_streams_texts" CASCADE;`)
}

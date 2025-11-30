import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_live_chat_type" ADD VALUE 'superchat';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "live_chat" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "live_chat" ALTER COLUMN "type" SET DEFAULT 'user'::text;
  DROP TYPE "public"."enum_live_chat_type";
  CREATE TYPE "public"."enum_live_chat_type" AS ENUM('user', 'system', 'moderator');
  ALTER TABLE "live_chat" ALTER COLUMN "type" SET DEFAULT 'user'::"public"."enum_live_chat_type";
  ALTER TABLE "live_chat" ALTER COLUMN "type" SET DATA TYPE "public"."enum_live_chat_type" USING "type"::"public"."enum_live_chat_type";`)
}

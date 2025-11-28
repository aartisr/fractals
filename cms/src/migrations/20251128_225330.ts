import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_live_streams_status" ADD VALUE 'ending' BEFORE 'ended';
  ALTER TABLE "live_streams" ADD COLUMN "ending_status" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "live_streams" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "live_streams" ALTER COLUMN "status" SET DEFAULT 'idle'::text;
  DROP TYPE "public"."enum_live_streams_status";
  CREATE TYPE "public"."enum_live_streams_status" AS ENUM('idle', 'live', 'ended');
  ALTER TABLE "live_streams" ALTER COLUMN "status" SET DEFAULT 'idle'::"public"."enum_live_streams_status";
  ALTER TABLE "live_streams" ALTER COLUMN "status" SET DATA TYPE "public"."enum_live_streams_status" USING "status"::"public"."enum_live_streams_status";
  ALTER TABLE "live_streams" DROP COLUMN "ending_status";`)
}

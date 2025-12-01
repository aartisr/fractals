import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "live_stream_views" ADD COLUMN "paused_duration_seconds" numeric;
  ALTER TABLE "video_views" ADD COLUMN "paused_duration_seconds" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "live_stream_views" DROP COLUMN "paused_duration_seconds";
  ALTER TABLE "video_views" DROP COLUMN "paused_duration_seconds";`)
}

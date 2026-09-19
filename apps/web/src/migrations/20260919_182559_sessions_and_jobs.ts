import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_contact_messages_delivery_status" AS ENUM('pending', 'sent', 'failed');
  CREATE TYPE "public"."enum_booking_leads_delivery_status" AS ENUM('pending', 'sent', 'failed');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'revalidate-cache');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'revalidate-cache');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "media_locales" DROP CONSTRAINT "media_locales_locale_parent_id_unique";
  ALTER TABLE "authors_locales" DROP CONSTRAINT "authors_locales_locale_parent_id_unique";
  ALTER TABLE "categories_locales" DROP CONSTRAINT "categories_locales_locale_parent_id_unique";
  ALTER TABLE "insights_locales" DROP CONSTRAINT "insights_locales_locale_parent_id_unique";
  ALTER TABLE "_insights_v_locales" DROP CONSTRAINT "_insights_v_locales_locale_parent_id_unique";
  ALTER TABLE "regulations_locales" DROP CONSTRAINT "regulations_locales_locale_parent_id_unique";
  ALTER TABLE "services_locales" DROP CONSTRAINT "services_locales_locale_parent_id_unique";
  ALTER TABLE "site_settings_locales" DROP CONSTRAINT "site_settings_locales_locale_parent_id_unique";
  ALTER TABLE "footer_locales" DROP CONSTRAINT "footer_locales_locale_parent_id_unique";
  ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;
  ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT 'media';
  ALTER TABLE "contact_messages" ADD COLUMN "submission_id" varchar;
  ALTER TABLE "contact_messages" ADD COLUMN "delivery_status" "enum_contact_messages_delivery_status" DEFAULT 'pending' NOT NULL;
  ALTER TABLE "contact_messages" ADD COLUMN "delivery_attempts" numeric DEFAULT 0 NOT NULL;
  ALTER TABLE "contact_messages" ADD COLUMN "last_delivery_attempt_at" timestamp(3) with time zone;
  ALTER TABLE "contact_messages" ADD COLUMN "delivered_at" timestamp(3) with time zone;
  ALTER TABLE "contact_messages" ADD COLUMN "delivery_error" varchar;
  ALTER TABLE "booking_leads" ADD COLUMN "submission_id" varchar;
  ALTER TABLE "booking_leads" ADD COLUMN "delivery_status" "enum_booking_leads_delivery_status" DEFAULT 'pending' NOT NULL;
  ALTER TABLE "booking_leads" ADD COLUMN "delivery_attempts" numeric DEFAULT 0 NOT NULL;
  ALTER TABLE "booking_leads" ADD COLUMN "last_delivery_attempt_at" timestamp(3) with time zone;
  ALTER TABLE "booking_leads" ADD COLUMN "delivered_at" timestamp(3) with time zone;
  ALTER TABLE "booking_leads" ADD COLUMN "delivery_error" varchar;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "authors_locales_locale_parent_id_unique" ON "authors_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "categories_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "insights_locales_locale_parent_id_unique" ON "insights_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_insights_v_locales_locale_parent_id_unique" ON "_insights_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "regulations_locales_locale_parent_id_unique" ON "regulations_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "services_locales_locale_parent_id_unique" ON "services_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "contact_messages_submission_id_idx" ON "contact_messages" USING btree ("submission_id");
  CREATE INDEX "contact_messages_delivery_status_idx" ON "contact_messages" USING btree ("delivery_status");
  CREATE UNIQUE INDEX "booking_leads_submission_id_idx" ON "booking_leads" USING btree ("submission_id");
  CREATE INDEX "booking_leads_delivery_status_idx" ON "booking_leads" USING btree ("delivery_status");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "footer_locales_locale_parent_id_unique" ON "footer_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "insights" DROP COLUMN "status";
  ALTER TABLE "_insights_v" DROP COLUMN "version_status";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_kv" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP INDEX "media_locales_locale_parent_id_unique";
  DROP INDEX "authors_locales_locale_parent_id_unique";
  DROP INDEX "categories_locales_locale_parent_id_unique";
  DROP INDEX "insights_locales_locale_parent_id_unique";
  DROP INDEX "_insights_v_locales_locale_parent_id_unique";
  DROP INDEX "regulations_locales_locale_parent_id_unique";
  DROP INDEX "services_locales_locale_parent_id_unique";
  DROP INDEX "contact_messages_submission_id_idx";
  DROP INDEX "contact_messages_delivery_status_idx";
  DROP INDEX "booking_leads_submission_id_idx";
  DROP INDEX "booking_leads_delivery_status_idx";
  DROP INDEX "site_settings_locales_locale_parent_id_unique";
  DROP INDEX "footer_locales_locale_parent_id_unique";
  ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL;
  ALTER TABLE "insights" ADD COLUMN "status" "enum_insights_status" DEFAULT 'draft';
  ALTER TABLE "_insights_v" ADD COLUMN "version_status" "enum__insights_v_version_status" DEFAULT 'draft';
  ALTER TABLE "media" DROP COLUMN "prefix";
  ALTER TABLE "contact_messages" DROP COLUMN "submission_id";
  ALTER TABLE "contact_messages" DROP COLUMN "delivery_status";
  ALTER TABLE "contact_messages" DROP COLUMN "delivery_attempts";
  ALTER TABLE "contact_messages" DROP COLUMN "last_delivery_attempt_at";
  ALTER TABLE "contact_messages" DROP COLUMN "delivered_at";
  ALTER TABLE "contact_messages" DROP COLUMN "delivery_error";
  ALTER TABLE "booking_leads" DROP COLUMN "submission_id";
  ALTER TABLE "booking_leads" DROP COLUMN "delivery_status";
  ALTER TABLE "booking_leads" DROP COLUMN "delivery_attempts";
  ALTER TABLE "booking_leads" DROP COLUMN "last_delivery_attempt_at";
  ALTER TABLE "booking_leads" DROP COLUMN "delivered_at";
  ALTER TABLE "booking_leads" DROP COLUMN "delivery_error";
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id");
  ALTER TABLE "authors_locales" ADD CONSTRAINT "authors_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id");
  ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id");
  ALTER TABLE "insights_locales" ADD CONSTRAINT "insights_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id");
  ALTER TABLE "_insights_v_locales" ADD CONSTRAINT "_insights_v_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id");
  ALTER TABLE "regulations_locales" ADD CONSTRAINT "regulations_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id");
  ALTER TABLE "services_locales" ADD CONSTRAINT "services_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id");
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id");
  ALTER TABLE "footer_locales" ADD CONSTRAINT "footer_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id");
  DROP TYPE "public"."enum_contact_messages_delivery_status";
  DROP TYPE "public"."enum_booking_leads_delivery_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}

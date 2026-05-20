import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_insights_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__insights_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__insights_v_published_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_services_timeline_steps_who" AS ENUM('we', 'joint', 'you');
  CREATE TYPE "public"."enum_contact_messages_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_contact_messages_status" AS ENUM('new', 'contacted', 'converted', 'dropped');
  CREATE TYPE "public"."enum_booking_leads_preferred_windows" AS ENUM('mon-am', 'mon-pm', 'tue-am', 'tue-pm', 'wed-am', 'wed-pm', 'thu-am', 'thu-pm', 'fri-am', 'fri-pm');
  CREATE TYPE "public"."enum_booking_leads_locale" AS ENUM('en', 'id');
  CREATE TYPE "public"."enum_booking_leads_status" AS ENUM('new', 'contacted', 'converted', 'dropped');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'client');
  CREATE TYPE "public"."enum_site_settings_default_locale" AS ENUM('en', 'id');
  CREATE TABLE IF NOT EXISTS "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "media_locales" (
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL,
  	CONSTRAINT "media_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id")
  );
  
  CREATE TABLE IF NOT EXISTS "authors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"photo_id" integer,
  	"linkedin_url" varchar,
  	"email" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "authors_locales" (
  	"role" varchar NOT NULL,
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL,
  	CONSTRAINT "authors_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id")
  );
  
  CREATE TABLE IF NOT EXISTS "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "categories_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL,
  	CONSTRAINT "categories_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id")
  );
  
  CREATE TABLE IF NOT EXISTS "insights" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"category_id" integer,
  	"author_id" integer,
  	"cover_image_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"est_read_time" numeric,
  	"status" "enum_insights_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_insights_status" DEFAULT 'draft'
  );
  
  CREATE TABLE IF NOT EXISTS "insights_locales" (
  	"title" varchar,
  	"lead" varchar,
  	"body" jsonb,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL,
  	CONSTRAINT "insights_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id")
  );
  
  CREATE TABLE IF NOT EXISTS "insights_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"regulations_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "_insights_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_category_id" integer,
  	"version_author_id" integer,
  	"version_cover_image_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_est_read_time" numeric,
  	"version_status" "enum__insights_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__insights_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__insights_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE IF NOT EXISTS "_insights_v_locales" (
  	"version_title" varchar,
  	"version_lead" varchar,
  	"version_body" jsonb,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL,
  	CONSTRAINT "_insights_v_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id")
  );
  
  CREATE TABLE IF NOT EXISTS "_insights_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"regulations_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "regulations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"effective_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "regulations_locales" (
  	"title" varchar NOT NULL,
  	"notes" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL,
  	CONSTRAINT "regulations_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id")
  );
  
  CREATE TABLE IF NOT EXISTS "services_who_for" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"persona" varchar NOT NULL,
  	"desc" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "services_requirements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "services_timeline_steps_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"doc" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "services_timeline_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"week" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"who" "enum_services_timeline_steps_who" NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "services_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"q" varchar NOT NULL,
  	"a" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "services" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 100 NOT NULL,
  	"pricing_gov_fee" numeric DEFAULT 0 NOT NULL,
  	"pricing_our_fee" numeric DEFAULT 0 NOT NULL,
  	"pricing_currency" varchar DEFAULT 'IDR' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "services_locales" (
  	"name" varchar NOT NULL,
  	"timeline_label" varchar NOT NULL,
  	"lead_paragraph" varchar NOT NULL,
  	"overview" jsonb NOT NULL,
  	"outside_scope" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL,
  	CONSTRAINT "services_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id")
  );
  
  CREATE TABLE IF NOT EXISTS "services_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"regulations_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "contact_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"company" varchar,
  	"message" varchar NOT NULL,
  	"locale" "enum_contact_messages_locale" DEFAULT 'en' NOT NULL,
  	"status" "enum_contact_messages_status" DEFAULT 'new' NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "booking_leads_preferred_windows" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_booking_leads_preferred_windows",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "booking_leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"company" varchar,
  	"phone" varchar,
  	"service_id" integer NOT NULL,
  	"message" varchar NOT NULL,
  	"locale" "enum_booking_leads_locale" DEFAULT 'en' NOT NULL,
  	"status" "enum_booking_leads_status" DEFAULT 'new' NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "enum_users_role" DEFAULT 'client',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE IF NOT EXISTS "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"authors_id" integer,
  	"categories_id" integer,
  	"insights_id" integer,
  	"regulations_id" integer,
  	"services_id" integer,
  	"contact_messages_id" integer,
  	"booking_leads_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand_name" varchar DEFAULT 'Jakarta Business Center' NOT NULL,
  	"default_locale" "enum_site_settings_default_locale" DEFAULT 'en',
  	"social_linkedin" varchar,
  	"social_whatsapp" varchar,
  	"social_email" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE IF NOT EXISTS "site_settings_locales" (
  	"tagline" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL,
  	CONSTRAINT "site_settings_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id")
  );
  
  CREATE TABLE IF NOT EXISTS "nav_menu_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL,
  	"external" boolean DEFAULT false
  );
  
  CREATE TABLE IF NOT EXISTS "nav_menu" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE IF NOT EXISTS "footer_address" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"line" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "footer_licenses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "footer_legal_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE IF NOT EXISTS "footer_locales" (
  	"notice" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL,
  	CONSTRAINT "footer_locales_locale_parent_id_unique" UNIQUE("_locale","_parent_id")
  );
  
  DO $$ BEGIN
   ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "authors" ADD CONSTRAINT "authors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "authors_locales" ADD CONSTRAINT "authors_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "insights" ADD CONSTRAINT "insights_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "insights" ADD CONSTRAINT "insights_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "insights" ADD CONSTRAINT "insights_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "insights_locales" ADD CONSTRAINT "insights_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."insights"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "insights_rels" ADD CONSTRAINT "insights_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."insights"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "insights_rels" ADD CONSTRAINT "insights_rels_regulations_fk" FOREIGN KEY ("regulations_id") REFERENCES "public"."regulations"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_insights_v" ADD CONSTRAINT "_insights_v_parent_id_insights_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."insights"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_insights_v" ADD CONSTRAINT "_insights_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_insights_v" ADD CONSTRAINT "_insights_v_version_author_id_authors_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_insights_v" ADD CONSTRAINT "_insights_v_version_cover_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_insights_v_locales" ADD CONSTRAINT "_insights_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_insights_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_insights_v_rels" ADD CONSTRAINT "_insights_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_insights_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_insights_v_rels" ADD CONSTRAINT "_insights_v_rels_regulations_fk" FOREIGN KEY ("regulations_id") REFERENCES "public"."regulations"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "regulations_locales" ADD CONSTRAINT "regulations_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."regulations"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "services_who_for" ADD CONSTRAINT "services_who_for_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "services_requirements" ADD CONSTRAINT "services_requirements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "services_timeline_steps_docs" ADD CONSTRAINT "services_timeline_steps_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_timeline_steps"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "services_timeline_steps" ADD CONSTRAINT "services_timeline_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "services_faq" ADD CONSTRAINT "services_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "services_locales" ADD CONSTRAINT "services_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_regulations_fk" FOREIGN KEY ("regulations_id") REFERENCES "public"."regulations"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "booking_leads_preferred_windows" ADD CONSTRAINT "booking_leads_preferred_windows_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."booking_leads"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "booking_leads" ADD CONSTRAINT "booking_leads_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_authors_fk" FOREIGN KEY ("authors_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_insights_fk" FOREIGN KEY ("insights_id") REFERENCES "public"."insights"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_regulations_fk" FOREIGN KEY ("regulations_id") REFERENCES "public"."regulations"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_messages_fk" FOREIGN KEY ("contact_messages_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_booking_leads_fk" FOREIGN KEY ("booking_leads_id") REFERENCES "public"."booking_leads"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "nav_menu_items" ADD CONSTRAINT "nav_menu_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."nav_menu"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "footer_address" ADD CONSTRAINT "footer_address_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "footer_licenses" ADD CONSTRAINT "footer_licenses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "footer_legal_links" ADD CONSTRAINT "footer_legal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "footer_locales" ADD CONSTRAINT "footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX IF NOT EXISTS "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX IF NOT EXISTS "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX IF NOT EXISTS "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX IF NOT EXISTS "authors_photo_idx" ON "authors" USING btree ("photo_id");
  CREATE INDEX IF NOT EXISTS "authors_updated_at_idx" ON "authors" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "authors_created_at_idx" ON "authors" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "insights_slug_idx" ON "insights" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "insights_category_idx" ON "insights" USING btree ("category_id");
  CREATE INDEX IF NOT EXISTS "insights_author_idx" ON "insights" USING btree ("author_id");
  CREATE INDEX IF NOT EXISTS "insights_cover_image_idx" ON "insights" USING btree ("cover_image_id");
  CREATE INDEX IF NOT EXISTS "insights_updated_at_idx" ON "insights" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "insights_created_at_idx" ON "insights" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "insights__status_idx" ON "insights" USING btree ("_status");
  CREATE INDEX IF NOT EXISTS "insights_rels_order_idx" ON "insights_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "insights_rels_parent_idx" ON "insights_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "insights_rels_path_idx" ON "insights_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "insights_rels_regulations_id_idx" ON "insights_rels" USING btree ("regulations_id");
  CREATE INDEX IF NOT EXISTS "_insights_v_parent_idx" ON "_insights_v" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "_insights_v_version_version_slug_idx" ON "_insights_v" USING btree ("version_slug");
  CREATE INDEX IF NOT EXISTS "_insights_v_version_version_category_idx" ON "_insights_v" USING btree ("version_category_id");
  CREATE INDEX IF NOT EXISTS "_insights_v_version_version_author_idx" ON "_insights_v" USING btree ("version_author_id");
  CREATE INDEX IF NOT EXISTS "_insights_v_version_version_cover_image_idx" ON "_insights_v" USING btree ("version_cover_image_id");
  CREATE INDEX IF NOT EXISTS "_insights_v_version_version_updated_at_idx" ON "_insights_v" USING btree ("version_updated_at");
  CREATE INDEX IF NOT EXISTS "_insights_v_version_version_created_at_idx" ON "_insights_v" USING btree ("version_created_at");
  CREATE INDEX IF NOT EXISTS "_insights_v_version_version__status_idx" ON "_insights_v" USING btree ("version__status");
  CREATE INDEX IF NOT EXISTS "_insights_v_created_at_idx" ON "_insights_v" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "_insights_v_updated_at_idx" ON "_insights_v" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "_insights_v_snapshot_idx" ON "_insights_v" USING btree ("snapshot");
  CREATE INDEX IF NOT EXISTS "_insights_v_published_locale_idx" ON "_insights_v" USING btree ("published_locale");
  CREATE INDEX IF NOT EXISTS "_insights_v_latest_idx" ON "_insights_v" USING btree ("latest");
  CREATE INDEX IF NOT EXISTS "_insights_v_rels_order_idx" ON "_insights_v_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "_insights_v_rels_parent_idx" ON "_insights_v_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "_insights_v_rels_path_idx" ON "_insights_v_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "_insights_v_rels_regulations_id_idx" ON "_insights_v_rels" USING btree ("regulations_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "regulations_code_idx" ON "regulations" USING btree ("code");
  CREATE INDEX IF NOT EXISTS "regulations_updated_at_idx" ON "regulations" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "regulations_created_at_idx" ON "regulations" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "services_who_for_order_idx" ON "services_who_for" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "services_who_for_parent_id_idx" ON "services_who_for" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "services_who_for_locale_idx" ON "services_who_for" USING btree ("_locale");
  CREATE INDEX IF NOT EXISTS "services_requirements_order_idx" ON "services_requirements" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "services_requirements_parent_id_idx" ON "services_requirements" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "services_requirements_locale_idx" ON "services_requirements" USING btree ("_locale");
  CREATE INDEX IF NOT EXISTS "services_timeline_steps_docs_order_idx" ON "services_timeline_steps_docs" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "services_timeline_steps_docs_parent_id_idx" ON "services_timeline_steps_docs" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "services_timeline_steps_docs_locale_idx" ON "services_timeline_steps_docs" USING btree ("_locale");
  CREATE INDEX IF NOT EXISTS "services_timeline_steps_order_idx" ON "services_timeline_steps" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "services_timeline_steps_parent_id_idx" ON "services_timeline_steps" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "services_timeline_steps_locale_idx" ON "services_timeline_steps" USING btree ("_locale");
  CREATE INDEX IF NOT EXISTS "services_faq_order_idx" ON "services_faq" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "services_faq_parent_id_idx" ON "services_faq" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "services_faq_locale_idx" ON "services_faq" USING btree ("_locale");
  CREATE UNIQUE INDEX IF NOT EXISTS "services_slug_idx" ON "services" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "services_updated_at_idx" ON "services" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "services_created_at_idx" ON "services" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "services_rels_order_idx" ON "services_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "services_rels_parent_idx" ON "services_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "services_rels_path_idx" ON "services_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "services_rels_regulations_id_idx" ON "services_rels" USING btree ("regulations_id");
  CREATE INDEX IF NOT EXISTS "contact_messages_email_idx" ON "contact_messages" USING btree ("email");
  CREATE INDEX IF NOT EXISTS "contact_messages_updated_at_idx" ON "contact_messages" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "booking_leads_preferred_windows_order_idx" ON "booking_leads_preferred_windows" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "booking_leads_preferred_windows_parent_idx" ON "booking_leads_preferred_windows" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "booking_leads_email_idx" ON "booking_leads" USING btree ("email");
  CREATE INDEX IF NOT EXISTS "booking_leads_service_idx" ON "booking_leads" USING btree ("service_id");
  CREATE INDEX IF NOT EXISTS "booking_leads_updated_at_idx" ON "booking_leads" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "booking_leads_created_at_idx" ON "booking_leads" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_authors_id_idx" ON "payload_locked_documents_rels" USING btree ("authors_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_insights_id_idx" ON "payload_locked_documents_rels" USING btree ("insights_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_regulations_id_idx" ON "payload_locked_documents_rels" USING btree ("regulations_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_services_id_idx" ON "payload_locked_documents_rels" USING btree ("services_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_contact_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_messages_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_booking_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("booking_leads_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX IF NOT EXISTS "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "nav_menu_items_order_idx" ON "nav_menu_items" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "nav_menu_items_parent_id_idx" ON "nav_menu_items" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "nav_menu_items_locale_idx" ON "nav_menu_items" USING btree ("_locale");
  CREATE INDEX IF NOT EXISTS "footer_address_order_idx" ON "footer_address" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "footer_address_parent_id_idx" ON "footer_address" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "footer_address_locale_idx" ON "footer_address" USING btree ("_locale");
  CREATE INDEX IF NOT EXISTS "footer_licenses_order_idx" ON "footer_licenses" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "footer_licenses_parent_id_idx" ON "footer_licenses" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "footer_licenses_locale_idx" ON "footer_licenses" USING btree ("_locale");
  CREATE INDEX IF NOT EXISTS "footer_legal_links_order_idx" ON "footer_legal_links" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "footer_legal_links_parent_id_idx" ON "footer_legal_links" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "footer_legal_links_locale_idx" ON "footer_legal_links" USING btree ("_locale");`)
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
   DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "authors" CASCADE;
  DROP TABLE "authors_locales" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "categories_locales" CASCADE;
  DROP TABLE "insights" CASCADE;
  DROP TABLE "insights_locales" CASCADE;
  DROP TABLE "insights_rels" CASCADE;
  DROP TABLE "_insights_v" CASCADE;
  DROP TABLE "_insights_v_locales" CASCADE;
  DROP TABLE "_insights_v_rels" CASCADE;
  DROP TABLE "regulations" CASCADE;
  DROP TABLE "regulations_locales" CASCADE;
  DROP TABLE "services_who_for" CASCADE;
  DROP TABLE "services_requirements" CASCADE;
  DROP TABLE "services_timeline_steps_docs" CASCADE;
  DROP TABLE "services_timeline_steps" CASCADE;
  DROP TABLE "services_faq" CASCADE;
  DROP TABLE "services" CASCADE;
  DROP TABLE "services_locales" CASCADE;
  DROP TABLE "services_rels" CASCADE;
  DROP TABLE "contact_messages" CASCADE;
  DROP TABLE "booking_leads_preferred_windows" CASCADE;
  DROP TABLE "booking_leads" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "nav_menu_items" CASCADE;
  DROP TABLE "nav_menu" CASCADE;
  DROP TABLE "footer_address" CASCADE;
  DROP TABLE "footer_licenses" CASCADE;
  DROP TABLE "footer_legal_links" CASCADE;
  DROP TABLE "footer" CASCADE;
  DROP TABLE "footer_locales" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_insights_status";
  DROP TYPE "public"."enum__insights_v_version_status";
  DROP TYPE "public"."enum__insights_v_published_locale";
  DROP TYPE "public"."enum_services_timeline_steps_who";
  DROP TYPE "public"."enum_contact_messages_locale";
  DROP TYPE "public"."enum_contact_messages_status";
  DROP TYPE "public"."enum_booking_leads_preferred_windows";
  DROP TYPE "public"."enum_booking_leads_locale";
  DROP TYPE "public"."enum_booking_leads_status";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_site_settings_default_locale";`)
}

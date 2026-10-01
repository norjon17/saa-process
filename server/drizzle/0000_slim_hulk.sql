CREATE TYPE "public"."contact_chip_value" AS ENUM('L', 'R', 'LR', 'REPAIR', 'PM');--> statement-breakpoint
CREATE TYPE "public"."endorsement_progress" AS ENUM('open', 'ongoing', 'done');--> statement-breakpoint
CREATE TYPE "public"."fixture" AS ENUM('L', 'R');--> statement-breakpoint
CREATE TYPE "public"."head_type" AS ENUM('UP', 'DN');--> statement-breakpoint
CREATE TYPE "public"."mc_axis" AS ENUM('pitch', 'roll');--> statement-breakpoint
CREATE TYPE "public"."mc_cell_status" AS ENUM('P_AUTO', 'F_AUTO', 'P_MAN', 'F_MAN', 'IDLE', 'MB');--> statement-breakpoint
CREATE TYPE "public"."mc_check" AS ENUM('delta_sat', 'delta_target', 'sigma', 'cpk');--> statement-breakpoint
CREATE TYPE "public"."mc_daily_overall" AS ENUM('passed', 'failed', 'idle', 'mb', 'pending');--> statement-breakpoint
CREATE TYPE "public"."mc_group" AS ENUM('left', 'right', 'overall');--> statement-breakpoint
CREATE TYPE "public"."mc_verdict" AS ENUM('passed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."people_kind" AS ENUM('by', 'to');--> statement-breakpoint
CREATE TYPE "public"."shift" AS ENUM('DS', 'NS');--> statement-breakpoint
CREATE TYPE "public"."tool_type" AS ENUM('SAAT05', 'SAAT07');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('tech', 'ee', 'admin');--> statement-breakpoint
CREATE TABLE "user_aliases" (
	"alias" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_no" varchar(4) NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'tech' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_idNo_unique" UNIQUE("id_no"),
	CONSTRAINT "users_id_no_digits" CHECK ("users"."id_no" ~ '^[0-9]{4}$')
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "regions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tool_aliases" (
	"alias" text PRIMARY KEY NOT NULL,
	"tool_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(6) NOT NULL,
	"region_id" integer,
	"tool_type" "tool_type",
	"ee_user_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	CONSTRAINT "tools_code_unique" UNIQUE("code"),
	CONSTRAINT "tools_code_format" CHECK ("tools"."code" ~ '^SAA[0-9]{2}H$')
);
--> statement-breakpoint
CREATE TABLE "models" (
	"code" varchar(3) PRIMARY KEY NOT NULL,
	"pitch_target" double precision NOT NULL,
	"roll_target" double precision DEFAULT 0 NOT NULL,
	"tolerance" double precision NOT NULL,
	"delta_sat_limit" double precision DEFAULT 0.05 NOT NULL,
	"delta_target_limit" double precision DEFAULT 0.05 NOT NULL,
	"sigma_limit" double precision DEFAULT 0.08 NOT NULL,
	"cpk_min" double precision DEFAULT 1.33 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "endorsement_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"shift" "shift" NOT NULL,
	"section_key" varchar(2) NOT NULL,
	"file_name" text NOT NULL,
	"stored_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "endorsement_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"section_key" varchar(2) DEFAULT 's6' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "endorsement_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "endorsement_people" (
	"endorsement_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"kind" "people_kind" NOT NULL,
	CONSTRAINT "endorsement_people_endorsement_id_user_id_kind_pk" PRIMARY KEY("endorsement_id","user_id","kind")
);
--> statement-breakpoint
CREATE TABLE "endorsements" (
	"id" serial PRIMARY KEY NOT NULL,
	"seq_no" integer,
	"date" date NOT NULL,
	"shift" "shift" NOT NULL,
	"category_id" integer,
	"tool_id" integer,
	"issue" text DEFAULT '' NOT NULL,
	"action_status" text DEFAULT '' NOT NULL,
	"progress" "endorsement_progress" DEFAULT 'open' NOT NULL,
	"is_none" boolean DEFAULT false NOT NULL,
	"section_key" varchar(2),
	"endorse_by_raw" text,
	"endorse_to_raw" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_ref" text,
	CONSTRAINT "endorsements_sourceRef_unique" UNIQUE("source_ref")
);
--> statement-breakpoint
CREATE TABLE "meancheck_checks" (
	"lot_id" integer NOT NULL,
	"group" "mc_group" NOT NULL,
	"axis" "mc_axis" NOT NULL,
	"check" "mc_check" NOT NULL,
	"value" double precision NOT NULL,
	"limit" double precision NOT NULL,
	"passed" boolean NOT NULL,
	CONSTRAINT "meancheck_checks_lot_id_group_axis_check_pk" PRIMARY KEY("lot_id","group","axis","check")
);
--> statement-breakpoint
CREATE TABLE "meancheck_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool_id" integer NOT NULL,
	"date" date NOT NULL,
	"vs_sat_psa_l" "mc_cell_status",
	"vs_sat_psa_r" "mc_cell_status",
	"vs_sat_rsa_l" "mc_cell_status",
	"vs_sat_rsa_r" "mc_cell_status",
	"vs_tgt_psa_l" "mc_cell_status",
	"vs_tgt_psa_r" "mc_cell_status",
	"vs_tgt_rsa_l" "mc_cell_status",
	"vs_tgt_rsa_r" "mc_cell_status",
	"overall" "mc_daily_overall" DEFAULT 'pending' NOT NULL,
	"lot_id" integer,
	"note" text,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_ref" text,
	CONSTRAINT "meancheck_daily_sourceRef_unique" UNIQUE("source_ref")
);
--> statement-breakpoint
CREATE TABLE "meancheck_lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"lot_no" text NOT NULL,
	"program_lot_name" text,
	"tool_id" integer NOT NULL,
	"model_code" varchar(3) NOT NULL,
	"head_type" "head_type",
	"suspension" text,
	"sat_tester" text,
	"mc_date" date NOT NULL,
	"shift" "shift",
	"asm_line" text,
	"asm_cell" text,
	"operator_id" text,
	"verdict" "mc_verdict" NOT NULL,
	"fail_count" smallint DEFAULT 0 NOT NULL,
	"engine_version" text NOT NULL,
	"spec_snapshot" jsonb NOT NULL,
	"head_delta" jsonb NOT NULL,
	"stats" jsonb NOT NULL,
	"files" jsonb NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meancheck_lots_lotNo_unique" UNIQUE("lot_no")
);
--> statement-breakpoint
CREATE TABLE "meancheck_readings" (
	"lot_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"fixture" "fixture" NOT NULL,
	"psa_before" double precision,
	"rsa_before" double precision,
	"psa_after" double precision,
	"rsa_after" double precision,
	"psa_remeasure" double precision,
	"rsa_remeasure" double precision,
	"psa_sat" double precision,
	"rsa_sat" double precision,
	"result_state" text,
	CONSTRAINT "meancheck_readings_lot_id_position_pk" PRIMARY KEY("lot_id","position")
);
--> statement-breakpoint
CREATE TABLE "pm_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool_id" integer NOT NULL,
	"period" date NOT NULL,
	"area" text,
	"tool_type" "tool_type",
	"ee_user_id" integer,
	"ee_raw" text,
	"actual_date" date,
	"fix_vac_l_with" double precision,
	"fix_vac_l_without" double precision,
	"fix_vac_r_with" double precision,
	"fix_vac_r_without" double precision,
	"pick_vac_l_with" double precision,
	"pick_vac_l_without" double precision,
	"pick_vac_r_with" double precision,
	"pick_vac_r_without" double precision,
	"clamp_l_clamp" double precision,
	"clamp_l_unclamp" double precision,
	"clamp_r_clamp" double precision,
	"clamp_r_unclamp" double precision,
	"fixture_spring" double precision,
	"speed_motor" double precision,
	"z_off_l_pickup" double precision,
	"z_off_l_release" double precision,
	"z_off_r_pickup" double precision,
	"z_off_r_release" double precision,
	"opt_grr" boolean,
	"opt_correlation" boolean,
	"opt_laser_recipe" boolean,
	"opt_additional_area" boolean,
	"opt_scan_pattern_dir" boolean,
	"fixture_left" text,
	"fixture_right" text,
	"scan_pattern" text,
	"remarks" text,
	"extra" jsonb,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_ref" text,
	CONSTRAINT "pm_status_sourceRef_unique" UNIQUE("source_ref")
);
--> statement-breakpoint
CREATE TABLE "circuit_burn" (
	"id" serial PRIMARY KEY NOT NULL,
	"seq_no" integer,
	"date" date,
	"shift" "shift",
	"tool_id" integer,
	"model_ht" text,
	"lot_no" text,
	"brick_qty" integer,
	"defect_qty" integer,
	"remarks" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_ref" text,
	CONSTRAINT "circuit_burn_sourceRef_unique" UNIQUE("source_ref")
);
--> statement-breakpoint
CREATE TABLE "contact_chip" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool_id" integer NOT NULL,
	"date" date NOT NULL,
	"value" "contact_chip_value" NOT NULL,
	"note" text,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_ref" text,
	CONSTRAINT "contact_chip_sourceRef_unique" UNIQUE("source_ref")
);
--> statement-breakpoint
CREATE TABLE "fit_ocap" (
	"id" serial PRIMARY KEY NOT NULL,
	"seq_no" integer,
	"date" date,
	"shift" "shift",
	"tool_id" integer,
	"tool_raw" text,
	"model" text,
	"fit_detection" text,
	"defect_name" text,
	"brick_qty" integer,
	"defect_qty" integer,
	"fit_confirmation" text,
	"before_action" text,
	"after_action" text,
	"remarks" text,
	"extra" jsonb,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_ref" text,
	CONSTRAINT "fit_ocap_sourceRef_unique" UNIQUE("source_ref")
);
--> statement-breakpoint
CREATE TABLE "low_cpk" (
	"id" serial PRIMARY KEY NOT NULL,
	"seq_no" integer,
	"date" date,
	"shift" "shift",
	"tool_id" integer,
	"model_ht" text,
	"model_code" varchar(3),
	"lot_no" text,
	"mean" double precision,
	"sigma" double precision,
	"cpk" double precision,
	"remarks" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_ref" text,
	CONSTRAINT "low_cpk_sourceRef_unique" UNIQUE("source_ref")
);
--> statement-breakpoint
CREATE TABLE "weekly_ooc" (
	"id" serial PRIMARY KEY NOT NULL,
	"seq_no" integer,
	"ww" smallint,
	"ww_year" smallint,
	"tool_id" integer,
	"tool_raw" text,
	"model" text,
	"head_type" text,
	"suspension" text,
	"issue" text,
	"endorse_by" text,
	"endorse_to" text,
	"remarks_after_action" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_ref" text,
	CONSTRAINT "weekly_ooc_sourceRef_unique" UNIQUE("source_ref")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip" text
);
--> statement-breakpoint
ALTER TABLE "user_aliases" ADD CONSTRAINT "user_aliases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_aliases" ADD CONSTRAINT "tool_aliases_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tools" ADD CONSTRAINT "tools_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tools" ADD CONSTRAINT "tools_ee_user_id_users_id_fk" FOREIGN KEY ("ee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsement_attachments" ADD CONSTRAINT "endorsement_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsement_people" ADD CONSTRAINT "endorsement_people_endorsement_id_endorsements_id_fk" FOREIGN KEY ("endorsement_id") REFERENCES "public"."endorsements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsement_people" ADD CONSTRAINT "endorsement_people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_category_id_endorsement_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."endorsement_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meancheck_checks" ADD CONSTRAINT "meancheck_checks_lot_id_meancheck_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."meancheck_lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meancheck_daily" ADD CONSTRAINT "meancheck_daily_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meancheck_daily" ADD CONSTRAINT "meancheck_daily_lot_id_meancheck_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."meancheck_lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meancheck_daily" ADD CONSTRAINT "meancheck_daily_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meancheck_lots" ADD CONSTRAINT "meancheck_lots_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meancheck_lots" ADD CONSTRAINT "meancheck_lots_model_code_models_code_fk" FOREIGN KEY ("model_code") REFERENCES "public"."models"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meancheck_lots" ADD CONSTRAINT "meancheck_lots_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meancheck_readings" ADD CONSTRAINT "meancheck_readings_lot_id_meancheck_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."meancheck_lots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_status" ADD CONSTRAINT "pm_status_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_status" ADD CONSTRAINT "pm_status_ee_user_id_users_id_fk" FOREIGN KEY ("ee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pm_status" ADD CONSTRAINT "pm_status_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuit_burn" ADD CONSTRAINT "circuit_burn_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuit_burn" ADD CONSTRAINT "circuit_burn_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuit_burn" ADD CONSTRAINT "circuit_burn_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_chip" ADD CONSTRAINT "contact_chip_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_chip" ADD CONSTRAINT "contact_chip_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fit_ocap" ADD CONSTRAINT "fit_ocap_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fit_ocap" ADD CONSTRAINT "fit_ocap_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fit_ocap" ADD CONSTRAINT "fit_ocap_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "low_cpk" ADD CONSTRAINT "low_cpk_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "low_cpk" ADD CONSTRAINT "low_cpk_model_code_models_code_fk" FOREIGN KEY ("model_code") REFERENCES "public"."models"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "low_cpk" ADD CONSTRAINT "low_cpk_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "low_cpk" ADD CONSTRAINT "low_cpk_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_ooc" ADD CONSTRAINT "weekly_ooc_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_ooc" ADD CONSTRAINT "weekly_ooc_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_ooc" ADD CONSTRAINT "weekly_ooc_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tools_region_idx" ON "tools" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "endorsement_attachments_shift_idx" ON "endorsement_attachments" USING btree ("date","shift","section_key");--> statement-breakpoint
CREATE INDEX "endorsement_people_user_idx" ON "endorsement_people" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "endorsements_date_idx" ON "endorsements" USING btree ("date","id");--> statement-breakpoint
CREATE INDEX "endorsements_tool_date_idx" ON "endorsements" USING btree ("tool_id","date");--> statement-breakpoint
CREATE INDEX "endorsements_category_idx" ON "endorsements" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "endorsements_progress_idx" ON "endorsements" USING btree ("progress");--> statement-breakpoint
CREATE UNIQUE INDEX "meancheck_daily_tool_date_uq" ON "meancheck_daily" USING btree ("tool_id","date");--> statement-breakpoint
CREATE INDEX "meancheck_daily_date_idx" ON "meancheck_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX "meancheck_lots_tool_date_idx" ON "meancheck_lots" USING btree ("tool_id","mc_date");--> statement-breakpoint
CREATE INDEX "meancheck_lots_date_idx" ON "meancheck_lots" USING btree ("mc_date");--> statement-breakpoint
CREATE INDEX "meancheck_lots_verdict_idx" ON "meancheck_lots" USING btree ("verdict");--> statement-breakpoint
CREATE UNIQUE INDEX "pm_status_tool_period_uq" ON "pm_status" USING btree ("tool_id","period");--> statement-breakpoint
CREATE INDEX "pm_status_period_idx" ON "pm_status" USING btree ("period");--> statement-breakpoint
CREATE INDEX "circuit_burn_date_idx" ON "circuit_burn" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_chip_tool_date_uq" ON "contact_chip" USING btree ("tool_id","date");--> statement-breakpoint
CREATE INDEX "contact_chip_date_idx" ON "contact_chip" USING btree ("date");--> statement-breakpoint
CREATE INDEX "fit_ocap_date_idx" ON "fit_ocap" USING btree ("date");--> statement-breakpoint
CREATE INDEX "low_cpk_date_idx" ON "low_cpk" USING btree ("date");--> statement-breakpoint
CREATE INDEX "weekly_ooc_ww_idx" ON "weekly_ooc" USING btree ("ww_year","ww");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");
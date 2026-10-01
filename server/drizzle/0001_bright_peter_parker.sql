CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'activate', 'deactivate', 'delete');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_label" text,
	"action" "audit_action" NOT NULL,
	"changes" jsonb NOT NULL,
	"actor_id" integer,
	"actor_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_created_idx" ON "audit_logs" USING btree ("entity","created_at" desc,"id" desc);--> statement-breakpoint
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs" USING btree ("entity","entity_id","id" desc);--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");
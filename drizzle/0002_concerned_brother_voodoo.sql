CREATE TABLE "resolution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" varchar(500) NOT NULL,
	"normalized_query" varchar(500) NOT NULL,
	"language" varchar(10) NOT NULL,
	"resolved_stage" integer,
	"resolved_spot_id" uuid,
	"confidence" numeric(3, 2),
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "location_aliases" ALTER COLUMN "spot_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resolution_logs" ADD CONSTRAINT "resolution_logs_resolved_spot_id_tourism_spots_id_fk" FOREIGN KEY ("resolved_spot_id") REFERENCES "public"."tourism_spots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_resolution_logs_query" ON "resolution_logs" USING btree ("normalized_query");--> statement-breakpoint
CREATE INDEX "idx_resolution_logs_created" ON "resolution_logs" USING btree ("created_at");
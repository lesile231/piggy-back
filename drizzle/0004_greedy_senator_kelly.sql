CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_ko" varchar(255) NOT NULL,
	"names" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"description" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"discount" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_name" varchar(255) NOT NULL,
	"location_name" jsonb DEFAULT '{}'::jsonb,
	"address_ko" text,
	"image_url" varchar(500),
	"link_url" varchar(500),
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"source" varchar(20) DEFAULT 'curated' NOT NULL,
	"source_url" varchar(500),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"spot_id" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spot_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"token_id" uuid,
	"rating" smallint NOT NULL,
	"comment" text,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_tokens" ADD CONSTRAINT "review_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tokens" ADD CONSTRAINT "review_tokens_spot_id_tourism_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."tourism_spots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_spot_id_tourism_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."tourism_spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_token_id_review_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."review_tokens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_review_tokens_token" ON "review_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reviews_spot_user" ON "reviews" USING btree ("spot_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_spot" ON "reviews" USING btree ("spot_id","created_at");
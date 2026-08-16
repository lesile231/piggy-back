import {
  pgTable, uuid, varchar, text, boolean, integer,
  timestamp, decimal, jsonb, uniqueIndex, index, primaryKey,
} from "drizzle-orm/pg-core";

// ── Users & Sessions ──

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  platform: varchar("platform", { length: 20 }).notNull(),
  platformUid: varchar("platform_uid", { length: 255 }).notNull(),
  language: varchar("language", { length: 10 }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").default({}),
}, (t) => [
  uniqueIndex("uq_users_platform_uid").on(t.platform, t.platformUid),
]);

// ── Flows (CMS-Managed) ── (Moved before chatSessions to resolve forward references)

export const flows = pgTable("flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 10 }),
  displayNames: jsonb("display_names").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const flowSteps = pgTable("flow_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  flowId: uuid("flow_id").notNull().references(() => flows.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  messages: jsonb("messages").notNull().default({}),
  apiAction: varchar("api_action", { length: 100 }),
  config: jsonb("config").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_flow_steps_order").on(t.flowId, t.stepOrder),
]);

export const flowOptions = pgTable("flow_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  stepId: uuid("step_id").notNull().references(() => flowSteps.id, { onDelete: "cascade" }),
  labels: jsonb("labels").notNull().default({}),
  value: varchar("value", { length: 255 }).notNull(),
  nextStepId: uuid("next_step_id").references(() => flowSteps.id),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ── Chat Sessions (now flows and flowSteps are defined) ──

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  mode: varchar("mode", { length: 20 }).notNull().default("menu"),
  activeFlowId: uuid("active_flow_id").references(() => flows.id),
  currentStepId: uuid("current_step_id").references(() => flowSteps.id),
  flowContext: jsonb("flow_context").default({}),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  direction: varchar("direction", { length: 10 }).notNull(),
  contentType: varchar("content_type", { length: 20 }).notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}),
  tokensUsed: integer("tokens_used").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_messages_session").on(t.sessionId, t.createdAt),
  index("idx_messages_user").on(t.userId, t.createdAt),
]);

// ── Tourism Content ──

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  names: jsonb("names").notNull().default({}),
  icon: varchar("icon", { length: 10 }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const tourismSpots = pgTable("tourism_spots", {
  id: uuid("id").primaryKey().defaultRandom(),
  googlePlaceId: varchar("google_place_id", { length: 255 }),
  nameKo: varchar("name_ko", { length: 255 }).notNull(),
  names: jsonb("names").notNull().default({}),
  description: jsonb("description").notNull().default({}),
  addressKo: text("address_ko"),
  addresses: jsonb("addresses").default({}),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 500 }),
  images: jsonb("images").default([]),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  priceLevel: integer("price_level"),
  openingHours: jsonb("opening_hours").default({}),
  tags: jsonb("tags").default([]),
  source: varchar("source", { length: 20 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
// Note: embedding VECTOR(1536) column added via raw SQL migration (Drizzle doesn't natively support pgvector)

export const spotCategories = pgTable("spot_categories", {
  spotId: uuid("spot_id").notNull().references(() => tourismSpots.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.spotId, t.categoryId] }),
]);

export const locationAliases = pgTable("location_aliases", {
  id: uuid("id").primaryKey().defaultRandom(),
  spotId: uuid("spot_id").notNull().references(() => tourismSpots.id, { onDelete: "cascade" }),
  alias: varchar("alias", { length: 255 }).notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  source: varchar("source", { length: 20 }).notNull(),
  /** 'place' = specific spot, 'area' = region search (returns all spots near this spot's coords) */
  type: varchar("type", { length: 10 }).notNull().default("place"),
}, (t) => [
  uniqueIndex("uq_alias_language").on(t.alias, t.language),
  index("idx_aliases_search").on(t.language, t.alias),
]);

// ── Events ──

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameKo: varchar("name_ko", { length: 255 }).notNull(),
  names: jsonb("names").notNull().default({}),
  description: jsonb("description").notNull().default({}),
  category: varchar("category", { length: 50 }).notNull(),
  venueName: jsonb("venue_name").default({}),
  addressKo: text("address_ko"),
  addresses: jsonb("addresses").default({}),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  recurrence: varchar("recurrence", { length: 20 }),
  priceInfo: jsonb("price_info").default({}),
  bookingUrl: varchar("booking_url", { length: 500 }),
  images: jsonb("images").default([]),
  source: varchar("source", { length: 20 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Resolution Logs (§4.1 Stage 5 logging) ──

export const resolutionLogs = pgTable("resolution_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  query: varchar("query", { length: 500 }).notNull(),
  normalizedQuery: varchar("normalized_query", { length: 500 }).notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  resolvedStage: integer("resolved_stage"),
  resolvedSpotId: uuid("resolved_spot_id").references(() => tourismSpots.id),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  success: boolean("success").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_resolution_logs_query").on(t.normalizedQuery),
  index("idx_resolution_logs_created").on(t.createdAt),
]);

// ── Ads & Revenue ──

export const advertisers = pgTable("advertisers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adCampaigns = pgTable("ad_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  advertiserId: uuid("advertiser_id").notNull().references(() => advertisers.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  content: jsonb("content").notNull().default({}),
  targetCategories: jsonb("target_categories").default([]),
  targetLanguages: jsonb("target_languages").default([]),
  budgetTotal: decimal("budget_total", { precision: 12, scale: 2 }),
  budgetSpent: decimal("budget_spent", { precision: 12, scale: 2 }).default("0"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adImpressions = pgTable("ad_impressions", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => adCampaigns.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  sessionId: uuid("session_id").references(() => chatSessions.id),
  eventType: varchar("event_type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_impressions_campaign").on(t.campaignId, t.createdAt),
]);

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => adCampaigns.id),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: jsonb("description").notNull().default({}),
  discountType: varchar("discount_type", { length: 20 }).notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id").notNull().references(() => coupons.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Admin ──

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("editor"),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull().references(() => adminUsers.id),
  action: varchar("action", { length: 50 }).notNull(),
  targetTable: varchar("target_table", { length: 50 }),
  targetId: uuid("target_id"),
  changes: jsonb("changes").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_audit_admin").on(t.adminId, t.createdAt),
]);

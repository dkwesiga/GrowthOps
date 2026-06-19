import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", [
  "user", "admin", "owner", "editor", "viewer",
]);
export const workspaceTypeEnum = pgEnum("workspace_type", [
  "local_service_business", "b2b_saas", "other",
]);
export const workspaceStatusEnum = pgEnum("workspace_status", [
  "active", "inactive", "archived",
]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft", "active", "paused", "completed", "archived",
]);
export const leadStatusEnum = pgEnum("lead_status", [
  "new", "researched", "scored", "draft_ready", "approved_for_contact",
  "contacted_manually", "replied", "booked", "not_fit", "follow_up_later",
  "closed_won", "closed_lost",
]);
export const contentTypeEnum = pgEnum("content_type", [
  "linkedin_post", "facebook_post", "x_post", "email",
  "blog_outline", "blog_article", "seo_page", "geo_answer_page",
  "review_request", "referral_request", "ad_copy", "landing_page_copy",
  "thought_leadership_post",
]);
// Shared by content_drafts.status and approvals.status (same value set).
export const draftStatusEnum = pgEnum("draft_status", [
  "draft", "needs_review", "revision_requested", "approved", "rejected",
  "gmail_draft_created", "sent_manually", "published_manually", "archived",
]);
export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "running", "completed", "failed", "cancelled",
]);
export const integrationProviderEnum = pgEnum("integration_provider", [
  "openrouter", "gmail", "google_sheets", "website_ingestion", "activepieces",
]);
export const integrationStatusEnum = pgEnum("integration_status", [
  "connected", "disconnected", "error", "mock",
]);

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  organizationId: integer("organizationId"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn", { mode: "date" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Organizations ────────────────────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  planType: varchar("planType", { length: 64 }).default("free").notNull(),
  billingStatus: varchar("billingStatus", { length: 64 }).default("active").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Organization = typeof organizations.$inferSelect;

// ─── Workspaces ───────────────────────────────────────────────────────────────
export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  organizationId: integer("organizationId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: workspaceTypeEnum("type").default("other").notNull(),
  status: workspaceStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Workspace = typeof workspaces.$inferSelect;

// ─── Brand Profiles ───────────────────────────────────────────────────────────
export const brandProfiles = pgTable("brand_profiles", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspaceId").notNull().unique(),
  brandName: varchar("brandName", { length: 255 }).notNull(),
  website: varchar("website", { length: 500 }),
  businessType: varchar("businessType", { length: 255 }),
  audience: text("audience"),
  painPoints: text("painPoints"),
  servicesOrProducts: text("servicesOrProducts"),
  offers: text("offers"),
  ctas: text("ctas"),
  toneOfVoice: text("toneOfVoice"),
  prohibitedClaims: text("prohibitedClaims"),
  complianceNotes: text("complianceNotes"),
  geographicFocus: varchar("geographicFocus", { length: 255 }),
  seedKeywords: text("seedKeywords"),
  competitors: text("competitors"),
  contactInfo: text("contactInfo"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type BrandProfile = typeof brandProfiles.$inferSelect;

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspaceId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  objective: text("objective"),
  audience: text("audience"),
  offer: text("offer"),
  channel: varchar("channel", { length: 255 }),
  status: campaignStatusEnum("status").default("draft").notNull(),
  startDate: timestamp("startDate", { mode: "date" }),
  endDate: timestamp("endDate", { mode: "date" }),
  kpis: text("kpis"),
  notes: text("notes"),
  aiPlan: text("aiPlan"),
  contentChecklist: text("contentChecklist"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Campaign = typeof campaigns.$inferSelect;

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspaceId").notNull(),
  campaignId: integer("campaignId"),
  companyName: varchar("companyName", { length: 255 }),
  contactName: varchar("contactName", { length: 255 }),
  roleTitle: varchar("roleTitle", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 500 }),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  location: varchar("location", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  fleetSizeEstimate: varchar("fleetSizeEstimate", { length: 100 }),
  painPoint: text("painPoint"),
  source: varchar("source", { length: 255 }),
  fitScore: real("fitScore"),
  urgencyScore: real("urgencyScore"),
  status: leadStatusEnum("status").default("new").notNull(),
  lastTouchpointAt: timestamp("lastTouchpointAt", { mode: "date" }),
  nextFollowUpAt: timestamp("nextFollowUpAt", { mode: "date" }),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Lead = typeof leads.$inferSelect;

// ─── Content Drafts ───────────────────────────────────────────────────────────
export const contentDrafts = pgTable("content_drafts", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspaceId").notNull(),
  campaignId: integer("campaignId"),
  leadId: integer("leadId"),
  contentType: contentTypeEnum("contentType").notNull(),
  channel: varchar("channel", { length: 100 }),
  title: varchar("title", { length: 500 }).notNull(),
  body: text("body").notNull(),
  critiqueNotes: text("critiqueNotes"),
  aiRationale: text("aiRationale"),
  riskNotes: text("riskNotes"),
  cta: varchar("cta", { length: 500 }),
  status: draftStatusEnum("status").default("draft").notNull(),
  version: integer("version").default(1).notNull(),
  createdByAgent: boolean("createdByAgent").default(false).notNull(),
  approvedBy: integer("approvedBy"),
  approvedAt: timestamp("approvedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type ContentDraft = typeof contentDrafts.$inferSelect;

// ─── Approvals ────────────────────────────────────────────────────────────────
export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspaceId").notNull(),
  contentDraftId: integer("contentDraftId").notNull(),
  requestedBy: integer("requestedBy"),
  reviewedBy: integer("reviewedBy"),
  status: draftStatusEnum("status").default("needs_review").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt", { mode: "date" }),
});

export type Approval = typeof approvals.$inferSelect;

// ─── Agent Runs ───────────────────────────────────────────────────────────────
export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspaceId").notNull(),
  agentName: varchar("agentName", { length: 255 }).notNull(),
  loopName: varchar("loopName", { length: 255 }),
  triggerType: varchar("triggerType", { length: 100 }),
  inputJson: text("inputJson"),
  outputJson: text("outputJson"),
  modelUsed: varchar("modelUsed", { length: 255 }),
  status: agentRunStatusEnum("status").default("running").notNull(),
  errorMessage: text("errorMessage"),
  createdRecordsJson: text("createdRecordsJson"),
  tokenUsageJson: text("tokenUsageJson"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completedAt", { mode: "date" }),
});

export type AgentRun = typeof agentRuns.$inferSelect;

// ─── Performance Logs ─────────────────────────────────────────────────────────
export const performanceLogs = pgTable("performance_logs", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspaceId").notNull(),
  campaignId: integer("campaignId"),
  contentDraftId: integer("contentDraftId"),
  channel: varchar("channel", { length: 100 }),
  metricName: varchar("metricName", { length: 255 }).notNull(),
  metricValue: real("metricValue").notNull(),
  source: varchar("source", { length: 255 }),
  recordedAt: timestamp("recordedAt", { mode: "date" }).defaultNow().notNull(),
});

// ─── Integrations ─────────────────────────────────────────────────────────────
export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organizationId").notNull(),
  workspaceId: integer("workspaceId"),
  provider: integrationProviderEnum("provider").notNull(),
  status: integrationStatusEnum("status").default("mock").notNull(),
  configJson: text("configJson"),
  lastSyncAt: timestamp("lastSyncAt", { mode: "date" }),
  errorMessage: text("errorMessage"),
  mockMode: boolean("mockMode").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Integration = typeof integrations.$inferSelect;

// ─── Usage Records ────────────────────────────────────────────────────────────
export const usageRecords = pgTable("usage_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organizationId").notNull(),
  workspaceId: integer("workspaceId").notNull(),
  usageType: varchar("usageType", { length: 100 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

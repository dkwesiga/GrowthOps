CREATE TYPE "public"."agent_run_status" AS ENUM('running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('linkedin_post', 'facebook_post', 'x_post', 'email', 'blog_outline', 'blog_article', 'seo_page', 'geo_answer_page', 'review_request', 'referral_request', 'ad_copy', 'landing_page_copy', 'thought_leadership_post');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('draft', 'needs_review', 'revision_requested', 'approved', 'rejected', 'gmail_draft_created', 'sent_manually', 'published_manually', 'archived');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('openrouter', 'gmail', 'google_sheets', 'website_ingestion', 'activepieces');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('connected', 'disconnected', 'error', 'mock');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'researched', 'scored', 'draft_ready', 'approved_for_contact', 'contacted_manually', 'replied', 'booked', 'not_fit', 'follow_up_later', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."workspace_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."workspace_type" AS ENUM('local_service_business', 'b2b_saas', 'other');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"agentName" varchar(255) NOT NULL,
	"loopName" varchar(255),
	"triggerType" varchar(100),
	"inputJson" text,
	"outputJson" text,
	"modelUsed" varchar(255),
	"status" "agent_run_status" DEFAULT 'running' NOT NULL,
	"errorMessage" text,
	"createdRecordsJson" text,
	"tokenUsageJson" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"contentDraftId" integer NOT NULL,
	"requestedBy" integer,
	"reviewedBy" integer,
	"status" "draft_status" DEFAULT 'needs_review' NOT NULL,
	"feedback" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"reviewedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "brand_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"brandName" varchar(255) NOT NULL,
	"website" varchar(500),
	"businessType" varchar(255),
	"audience" text,
	"painPoints" text,
	"servicesOrProducts" text,
	"offers" text,
	"ctas" text,
	"toneOfVoice" text,
	"prohibitedClaims" text,
	"complianceNotes" text,
	"geographicFocus" varchar(255),
	"seedKeywords" text,
	"competitors" text,
	"contactInfo" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brand_profiles_workspaceId_unique" UNIQUE("workspaceId")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"objective" text,
	"audience" text,
	"offer" text,
	"channel" varchar(255),
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"startDate" timestamp,
	"endDate" timestamp,
	"kpis" text,
	"notes" text,
	"aiPlan" text,
	"contentChecklist" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"campaignId" integer,
	"leadId" integer,
	"contentType" "content_type" NOT NULL,
	"channel" varchar(100),
	"title" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"critiqueNotes" text,
	"aiRationale" text,
	"riskNotes" text,
	"cta" varchar(500),
	"status" "draft_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"createdByAgent" boolean DEFAULT false NOT NULL,
	"approvedBy" integer,
	"approvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" integer NOT NULL,
	"workspaceId" integer,
	"provider" "integration_provider" NOT NULL,
	"status" "integration_status" DEFAULT 'mock' NOT NULL,
	"configJson" text,
	"lastSyncAt" timestamp,
	"errorMessage" text,
	"mockMode" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"campaignId" integer,
	"companyName" varchar(255),
	"contactName" varchar(255),
	"roleTitle" varchar(255),
	"email" varchar(320),
	"phone" varchar(50),
	"website" varchar(500),
	"linkedinUrl" varchar(500),
	"location" varchar(255),
	"industry" varchar(255),
	"fleetSizeEstimate" varchar(100),
	"painPoint" text,
	"source" varchar(255),
	"fitScore" real,
	"urgencyScore" real,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"lastTouchpointAt" timestamp,
	"nextFollowUpAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"planType" varchar(64) DEFAULT 'free' NOT NULL,
	"billingStatus" varchar(64) DEFAULT 'active' NOT NULL,
	"stripeCustomerId" varchar(255),
	"stripeSubscriptionId" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspaceId" integer NOT NULL,
	"campaignId" integer,
	"contentDraftId" integer,
	"channel" varchar(100),
	"metricName" varchar(255) NOT NULL,
	"metricValue" real NOT NULL,
	"source" varchar(255),
	"recordedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" integer NOT NULL,
	"workspaceId" integer NOT NULL,
	"usageType" varchar(100) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"metadataJson" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"organizationId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "workspace_type" DEFAULT 'other' NOT NULL,
	"status" "workspace_status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

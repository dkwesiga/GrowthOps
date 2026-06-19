-- ============================================================================
-- GrowthOps AI — Supabase setup (schema + demo seed)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: enums/tables use guards and the seed only runs on an empty DB.
-- ============================================================================

-- ─── Enum types ─────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "public"."agent_run_status" AS ENUM('running','completed','failed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."campaign_status" AS ENUM('draft','active','paused','completed','archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."content_type" AS ENUM('linkedin_post','facebook_post','x_post','email','blog_outline','blog_article','seo_page','geo_answer_page','review_request','referral_request','ad_copy','landing_page_copy','thought_leadership_post'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."draft_status" AS ENUM('draft','needs_review','revision_requested','approved','rejected','gmail_draft_created','sent_manually','published_manually','archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."integration_provider" AS ENUM('openrouter','gmail','google_sheets','website_ingestion','activepieces'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."integration_status" AS ENUM('connected','disconnected','error','mock'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."lead_status" AS ENUM('new','researched','scored','draft_ready','approved_for_contact','contacted_manually','replied','booked','not_fit','follow_up_later','closed_won','closed_lost'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."user_role" AS ENUM('user','admin','owner','editor','viewer'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."workspace_status" AS ENUM('active','inactive','archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."workspace_type" AS ENUM('local_service_business','b2b_saas','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Tables ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "agent_runs" (
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

CREATE TABLE IF NOT EXISTS "approvals" (
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

CREATE TABLE IF NOT EXISTS "brand_profiles" (
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

CREATE TABLE IF NOT EXISTS "campaigns" (
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

CREATE TABLE IF NOT EXISTS "content_drafts" (
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

CREATE TABLE IF NOT EXISTS "integrations" (
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

CREATE TABLE IF NOT EXISTS "leads" (
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

CREATE TABLE IF NOT EXISTS "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"planType" varchar(64) DEFAULT 'free' NOT NULL,
	"billingStatus" varchar(64) DEFAULT 'active' NOT NULL,
	"stripeCustomerId" varchar(255),
	"stripeSubscriptionId" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "performance_logs" (
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

CREATE TABLE IF NOT EXISTS "usage_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" integer NOT NULL,
	"workspaceId" integer NOT NULL,
	"usageType" varchar(100) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"metadataJson" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
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

CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "workspace_type" DEFAULT 'other' NOT NULL,
	"status" "workspace_status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

-- ─── Demo seed (only runs when there are no workspaces yet) ───────────────────
DO $$
DECLARE org_id int; md_id int; tf_id int;
BEGIN
  IF EXISTS (SELECT 1 FROM workspaces) THEN
    RAISE NOTICE 'Workspaces already exist — skipping seed.';
    RETURN;
  END IF;

  INSERT INTO organizations (name, "planType", "billingStatus")
    VALUES ('GrowthOps Demo Co', 'free', 'active') RETURNING id INTO org_id;

  INSERT INTO workspaces ("organizationId", name, type, status)
    VALUES (org_id, 'Mr Diesel', 'local_service_business', 'active') RETURNING id INTO md_id;
  INSERT INTO workspaces ("organizationId", name, type, status)
    VALUES (org_id, 'TruckFixr', 'local_service_business', 'active') RETURNING id INTO tf_id;

  INSERT INTO brand_profiles
    ("workspaceId","brandName",website,"businessType",audience,"painPoints","servicesOrProducts",offers,ctas,"toneOfVoice","prohibitedClaims","complianceNotes","geographicFocus","seedKeywords","contactInfo")
  VALUES
    (md_id,'Mr Diesel','https://mrdiesel.com.au','Diesel engine repair & fleet maintenance',
     'Fleet managers and owner-operators in Queensland',
     'Unexpected breakdowns, costly downtime, unreliable mechanics',
     'Diesel engine repair, fleet maintenance, mobile servicing',
     'Free 20-point fleet inspection for new accounts',
     'Book a service, Request a quote, Call our team',
     'Professional, trustworthy, no-nonsense',
     'No unverified performance claims, no guaranteed timeframes',
     'Australian Consumer Law applies','Queensland, Australia',
     'diesel repair, fleet maintenance, truck servicing Brisbane','1300 MR DIESEL'),
    (tf_id,'TruckFixr','https://truckfixr.com','On-demand truck repair marketplace',
     'Logistics companies and independent truckers',
     'Finding reliable repair shops on the road, opaque pricing',
     'Repair booking platform, roadside assistance network',
     'First booking fee waived',
     'Find a shop, Book a repair, Get roadside help',
     'Friendly, modern, reassuring',
     'No guaranteed repair times, no unverified shop ratings',
     'Marketplace disclaimers required','United States',
     'truck repair near me, roadside truck assistance, fleet repair app','support@truckfixr.com');

  INSERT INTO integrations ("organizationId", provider, status, "mockMode")
  VALUES
    (org_id,'openrouter','mock',true),
    (org_id,'gmail','mock',true),
    (org_id,'google_sheets','mock',true);

  RAISE NOTICE 'Seed complete: 1 org, 2 workspaces, 2 brand profiles, 3 integrations.';
END $$;

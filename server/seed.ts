import "dotenv/config";
import { getDb } from "./db";
import {
  brandProfiles,
  integrations,
  organizations,
  workspaces,
} from "../drizzle/schema";

// Idempotent seed: creates the demo organization, two workspaces
// (Mr Diesel, TruckFixr), their brand profiles, and default integrations.
// Safe to run multiple times — it bails out if workspaces already exist.
async function seed() {
  const db = await getDb();
  if (!db) {
    throw new Error("DATABASE_URL is not set or the database is unreachable.");
  }

  const existing = await db.select().from(workspaces).limit(1);
  if (existing.length > 0) {
    console.log("[seed] Workspaces already exist — skipping seed.");
    process.exit(0);
  }

  console.log("[seed] Seeding organization, workspaces, brand profiles, integrations…");

  const [org] = await db
    .insert(organizations)
    .values({ name: "GrowthOps Demo Co", planType: "free", billingStatus: "active" })
    .returning();

  const [mrDiesel] = await db
    .insert(workspaces)
    .values({
      organizationId: org.id,
      name: "Mr Diesel",
      type: "local_service_business",
      status: "active",
    })
    .returning();

  const [truckFixr] = await db
    .insert(workspaces)
    .values({
      organizationId: org.id,
      name: "TruckFixr",
      type: "local_service_business",
      status: "active",
    })
    .returning();

  await db.insert(brandProfiles).values([
    {
      workspaceId: mrDiesel.id,
      brandName: "Mr Diesel",
      website: "https://mrdiesel.com.au",
      businessType: "Diesel engine repair & fleet maintenance",
      audience: "Fleet managers and owner-operators in Queensland",
      painPoints: "Unexpected breakdowns, costly downtime, unreliable mechanics",
      servicesOrProducts: "Diesel engine repair, fleet maintenance, mobile servicing",
      offers: "Free 20-point fleet inspection for new accounts",
      ctas: "Book a service, Request a quote, Call our team",
      toneOfVoice: "Professional, trustworthy, no-nonsense",
      prohibitedClaims: "No unverified performance claims, no guaranteed timeframes",
      complianceNotes: "Australian Consumer Law applies",
      geographicFocus: "Queensland, Australia",
      seedKeywords: "diesel repair, fleet maintenance, truck servicing Brisbane",
      contactInfo: "1300 MR DIESEL",
    },
    {
      workspaceId: truckFixr.id,
      brandName: "TruckFixr",
      website: "https://truckfixr.com",
      businessType: "On-demand truck repair marketplace",
      audience: "Logistics companies and independent truckers",
      painPoints: "Finding reliable repair shops on the road, opaque pricing",
      servicesOrProducts: "Repair booking platform, roadside assistance network",
      offers: "First booking fee waived",
      ctas: "Find a shop, Book a repair, Get roadside help",
      toneOfVoice: "Friendly, modern, reassuring",
      prohibitedClaims: "No guaranteed repair times, no unverified shop ratings",
      complianceNotes: "Marketplace disclaimers required",
      geographicFocus: "United States",
      seedKeywords: "truck repair near me, roadside truck assistance, fleet repair app",
      contactInfo: "support@truckfixr.com",
    },
  ]);

  await db.insert(integrations).values([
    { organizationId: org.id, provider: "openrouter", status: "mock", mockMode: true },
    { organizationId: org.id, provider: "gmail", status: "mock", mockMode: true },
    { organizationId: org.id, provider: "google_sheets", status: "mock", mockMode: true },
  ]);

  console.log("[seed] Done. Created 1 org, 2 workspaces, 2 brand profiles, 3 integrations.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});

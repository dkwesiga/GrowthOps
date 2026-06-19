import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  agentRuns,
  approvals,
  brandProfiles,
  campaigns,
  contentDrafts,
  InsertUser,
  integrations,
  leads,
  organizations,
  performanceLogs,
  usageRecords,
  users,
  workspaces,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // `prepare: false` keeps us compatible with Supabase's transaction-mode
      // connection pooler (port 6543); it is harmless on a direct connection.
      // `max: 1` suits serverless (Vercel) where each instance should hold a
      // single pooled connection rather than a full pool.
      const client = postgres(process.env.DATABASE_URL, {
        prepare: false,
        max: 1,
        idle_timeout: 20,
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Workspaces ───────────────────────────────────────────────────────────────
export async function listWorkspaces() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workspaces).where(eq(workspaces.status, "active")).orderBy(workspaces.name);
}

export async function getWorkspace(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  return result[0];
}

// ─── Brand Profiles ───────────────────────────────────────────────────────────
export async function getBrandProfile(workspaceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(brandProfiles).where(eq(brandProfiles.workspaceId, workspaceId)).limit(1);
  return result[0];
}

export async function updateBrandProfile(workspaceId: number, data: Partial<typeof brandProfiles.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(brandProfiles).set(data).where(eq(brandProfiles.workspaceId, workspaceId));
}

// ─── Campaigns ────────────────────────────────────────────────────────────────
export async function listCampaigns(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.workspaceId, workspaceId)).orderBy(desc(campaigns.createdAt));
}

export async function getCampaign(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function createCampaign(data: typeof campaigns.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [row] = await db.insert(campaigns).values(data).returning();
  return row;
}

export async function updateCampaign(id: number, data: Partial<typeof campaigns.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function listLeads(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).where(eq(leads.workspaceId, workspaceId)).orderBy(desc(leads.createdAt));
}

export async function getLead(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

export async function createLead(data: typeof leads.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [row] = await db.insert(leads).values(data).returning();
  return row;
}

export async function updateLead(id: number, data: Partial<typeof leads.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(leads).set(data).where(eq(leads.id, id));
}

export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(leads).where(eq(leads.id, id));
}

// ─── Content Drafts ───────────────────────────────────────────────────────────
export async function listContentDrafts(workspaceId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(contentDrafts.workspaceId, workspaceId)];
  if (status) {
    conditions.push(eq(contentDrafts.status, status as typeof contentDrafts.$inferSelect.status));
  }
  return db.select().from(contentDrafts).where(and(...conditions)).orderBy(desc(contentDrafts.createdAt));
}

export async function getContentDraft(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentDrafts).where(eq(contentDrafts.id, id)).limit(1);
  return result[0];
}

export async function createContentDraft(data: typeof contentDrafts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [row] = await db.insert(contentDrafts).values(data).returning();
  return row;
}

export async function updateContentDraft(id: number, data: Partial<typeof contentDrafts.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contentDrafts).set(data).where(eq(contentDrafts.id, id));
}

// ─── Approvals ────────────────────────────────────────────────────────────────
export async function listApprovals(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(approvals).where(eq(approvals.workspaceId, workspaceId)).orderBy(desc(approvals.createdAt));
}

export async function createApproval(data: typeof approvals.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [row] = await db.insert(approvals).values(data).returning();
  return row;
}

export async function updateApproval(id: number, data: Partial<typeof approvals.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(approvals).set(data).where(eq(approvals.id, id));
}

// ─── Agent Runs ───────────────────────────────────────────────────────────────
export async function listAgentRuns(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentRuns).where(eq(agentRuns.workspaceId, workspaceId)).orderBy(desc(agentRuns.createdAt));
}

export async function createAgentRun(data: typeof agentRuns.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [row] = await db.insert(agentRuns).values(data).returning({ id: agentRuns.id });
  return row.id;
}

export async function updateAgentRun(id: number, data: Partial<typeof agentRuns.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(agentRuns).set(data).where(eq(agentRuns.id, id));
}

// ─── Integrations ─────────────────────────────────────────────────────────────
export async function listIntegrations(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(integrations).where(eq(integrations.organizationId, organizationId));
}

export async function updateIntegration(id: number, data: Partial<typeof integrations.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(integrations).set(data).where(eq(integrations.id, id));
}

// ─── Dashboard Summary ────────────────────────────────────────────────────────
export async function getDashboardSummary(workspaceId: number) {
  const db = await getDb();
  if (!db) return null;

  const [
    pendingApprovals,
    activeCampaigns,
    newLeads,
    readyDrafts,
    recentRuns,
  ] = await Promise.all([
    db.select().from(contentDrafts)
      .where(and(eq(contentDrafts.workspaceId, workspaceId), eq(contentDrafts.status, "needs_review")))
      .orderBy(desc(contentDrafts.createdAt)).limit(5),
    db.select().from(campaigns)
      .where(and(eq(campaigns.workspaceId, workspaceId), eq(campaigns.status, "active"))),
    db.select().from(leads)
      .where(and(eq(leads.workspaceId, workspaceId), eq(leads.status, "new")))
      .orderBy(desc(leads.createdAt)).limit(5),
    db.select().from(contentDrafts)
      .where(and(eq(contentDrafts.workspaceId, workspaceId), eq(contentDrafts.status, "approved")))
      .orderBy(desc(contentDrafts.updatedAt)).limit(5),
    db.select().from(agentRuns)
      .where(eq(agentRuns.workspaceId, workspaceId))
      .orderBy(desc(agentRuns.createdAt)).limit(5),
  ]);

  return { pendingApprovals, activeCampaigns, newLeads, readyDrafts, recentRuns };
}

// ─── Performance Logs ─────────────────────────────────────────────────────────
export async function listPerformanceLogs(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(performanceLogs).where(eq(performanceLogs.workspaceId, workspaceId)).orderBy(desc(performanceLogs.recordedAt)).limit(50);
}

export async function createPerformanceLog(data: typeof performanceLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(performanceLogs).values(data);
}

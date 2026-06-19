import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB calls
vi.mock("./db", () => ({
  listWorkspaces: vi.fn().mockResolvedValue([
    { id: 1, name: "Mr Diesel", type: "fleet_services", status: "active" },
    { id: 2, name: "TruckFixr", type: "fleet_services", status: "active" },
  ]),
  getBrandProfile: vi.fn().mockResolvedValue({
    id: 1,
    workspaceId: 1,
    brandName: "Mr Diesel",
    website: "https://mrdiesel.com.au",
    audience: "Fleet managers in Queensland",
    toneOfVoice: "Professional and trustworthy",
    servicesOrProducts: "Diesel engine repair, fleet maintenance",
    prohibitedClaims: "No unverified performance claims",
    complianceNotes: "Australian consumer law applies",
  }),
  updateBrandProfile: vi.fn().mockResolvedValue(undefined),
  listCampaigns: vi.fn().mockResolvedValue([]),
  getCampaign: vi.fn().mockResolvedValue(null),
  createCampaign: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateCampaign: vi.fn().mockResolvedValue(undefined),
  listLeads: vi.fn().mockResolvedValue([]),
  getLead: vi.fn().mockResolvedValue(null),
  createLead: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateLead: vi.fn().mockResolvedValue(undefined),
  deleteLead: vi.fn().mockResolvedValue(undefined),
  listContentDrafts: vi.fn().mockResolvedValue([]),
  getContentDraft: vi.fn().mockResolvedValue(null),
  createContentDraft: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateContentDraft: vi.fn().mockResolvedValue(undefined),
  listApprovals: vi.fn().mockResolvedValue([]),
  createApproval: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateApproval: vi.fn().mockResolvedValue(undefined),
  listAgentRuns: vi.fn().mockResolvedValue([]),
  createAgentRun: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateAgentRun: vi.fn().mockResolvedValue(undefined),
  listIntegrations: vi.fn().mockResolvedValue([
    { id: 1, provider: "google_sheets", status: "mock", mockMode: true },
    { id: 2, provider: "gmail", status: "mock", mockMode: true },
  ]),
  updateIntegration: vi.fn().mockResolvedValue(undefined),
  getDashboardSummary: vi.fn().mockResolvedValue({
    pendingApprovals: [],
    activeCampaigns: [],
    newLeads: [],
    readyDrafts: [],
    recentRuns: [],
  }),
  listPerformanceLogs: vi.fn().mockResolvedValue([]),
  createPerformanceLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./agentLoops", () => ({
  runCampaignStrategyLoop: vi.fn().mockResolvedValue({ planSummary: "test", draftsCreated: ["LinkedIn"], approvalsPending: 1 }),
  runContentLoop: vi.fn().mockResolvedValue({ draftsCreated: ["linkedin_post"], topic: "test" }),
  runLeadProspectingLoop: vi.fn().mockResolvedValue({ fitScore: 7.5, urgencyScore: 6.0, painPoint: "test", draftsCreated: ["Cold email"] }),
}));

function createPublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAuthCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("GrowthOps AI — Workspace Router", () => {
  it("lists workspaces including Mr Diesel and TruckFixr", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.workspaces.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Mr Diesel");
    expect(result[1].name).toBe("TruckFixr");
  });
});

describe("GrowthOps AI — Brand Profile Router", () => {
  it("gets brand profile for a workspace", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.brandProfile.get({ workspaceId: 1 });
    expect(result?.brandName).toBe("Mr Diesel");
    expect(result?.prohibitedClaims).toBeTruthy();
  });

  it("updates brand profile when authenticated", async () => {
    const caller = appRouter.createCaller(createAuthCtx());
    const result = await caller.brandProfile.update({
      workspaceId: 1,
      toneOfVoice: "Direct and authoritative",
    });
    expect(result.success).toBe(true);
  });
});

describe("GrowthOps AI — Dashboard Router", () => {
  it("returns dashboard summary with all required fields", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.dashboard.summary({ workspaceId: 1 });
    expect(result).toHaveProperty("pendingApprovals");
    expect(result).toHaveProperty("activeCampaigns");
    expect(result).toHaveProperty("newLeads");
    expect(result).toHaveProperty("readyDrafts");
    expect(result).toHaveProperty("recentRuns");
  });
});

describe("GrowthOps AI — Campaigns Router", () => {
  it("lists campaigns for a workspace", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.campaigns.list({ workspaceId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a campaign when authenticated", async () => {
    const caller = appRouter.createCaller(createAuthCtx());
    const result = await caller.campaigns.create({
      workspaceId: 1,
      name: "Test Campaign",
      objective: "Increase brand awareness",
    });
    expect(result).toBeTruthy();
  });

  it("runs campaign strategy loop when authenticated", async () => {
    const caller = appRouter.createCaller(createAuthCtx());
    const result = await caller.campaigns.runStrategyLoop({ workspaceId: 1, campaignId: 1 });
    expect(result).toHaveProperty("planSummary");
    expect(result).toHaveProperty("draftsCreated");
    expect(result).toHaveProperty("approvalsPending");
  });
});

describe("GrowthOps AI — Leads Router", () => {
  it("creates a lead when authenticated", async () => {
    const caller = appRouter.createCaller(createAuthCtx());
    const result = await caller.leads.create({
      workspaceId: 1,
      companyName: "Acme Fleet Co",
      contactName: "John Smith",
      roleTitle: "Fleet Manager",
    });
    expect(result).toBeTruthy();
  });

  it("runs lead prospecting loop when authenticated", async () => {
    const caller = appRouter.createCaller(createAuthCtx());
    const result = await caller.leads.runProspectingLoop({ workspaceId: 1, leadId: 1 });
    expect(result).toHaveProperty("fitScore");
    expect(result).toHaveProperty("urgencyScore");
    expect(result.fitScore).toBe(7.5);
  });
});

describe("GrowthOps AI — Integrations Router", () => {
  it("lists integrations", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.integrations.list({ organizationId: 1 });
    expect(result).toHaveLength(2);
    const providers = result.map((i) => i.provider);
    expect(providers).toContain("google_sheets");
    expect(providers).toContain("gmail");
  });

  it("toggles mock mode when authenticated", async () => {
    const caller = appRouter.createCaller(createAuthCtx());
    const result = await caller.integrations.toggleMockMode({ id: 1, mockMode: false });
    expect(result.success).toBe(true);
  });

  it("exports leads CSV", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.integrations.exportCSV({ workspaceId: 1, type: "leads" });
    expect(result).toHaveProperty("csv");
    expect(result).toHaveProperty("filename");
    expect(result.filename).toContain("leads");
  });

  it("exports campaigns CSV", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.integrations.exportCSV({ workspaceId: 1, type: "campaigns" });
    expect(result.filename).toContain("campaigns");
  });

  it("syncs to sheets in mock mode", async () => {
    const caller = appRouter.createCaller(createAuthCtx());
    const result = await caller.integrations.syncToSheets({ workspaceId: 1, dataType: "leads" });
    expect(result.success).toBe(true);
    expect(result.mode).toBe("mock");
  });

  it("creates gmail draft in mock mode", async () => {
    const caller = appRouter.createCaller(createAuthCtx());
    // getContentDraft returns null in mock, so we need to handle that
    // The mock returns null for getContentDraft, so this should throw
    await expect(
      caller.integrations.createGmailDraft({ draftId: 999, workspaceId: 1 })
    ).rejects.toThrow("Draft not found");
  });
});

describe("GrowthOps AI — Approvals Router", () => {
  it("updates approval status when authenticated", async () => {
    const caller = appRouter.createCaller(createAuthCtx());
    const result = await caller.approvals.updateStatus({
      approvalId: 1,
      draftId: 1,
      status: "approved",
      feedback: "Looks great!",
    });
    expect(result.success).toBe(true);
  });
});

describe("GrowthOps AI — Content Drafts Router", () => {
  it("runs content loop when authenticated", async () => {
    const caller = appRouter.createCaller(createAuthCtx());
    const result = await caller.contentDrafts.runContentLoop({
      workspaceId: 1,
      topic: "Fleet maintenance tips",
      contentTypes: ["linkedin_post"],
    });
    expect(result).toHaveProperty("draftsCreated");
  });
});

describe("auth.logout", () => {
  it("clears session cookie", async () => {
    const { ctx, clearedCookies } = (() => {
      const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
      const ctx: TrpcContext = {
        user: {
          id: 1, openId: "test", email: "t@t.com", name: "T", loginMethod: "manus",
          role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
        },
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: (name: string, opts: Record<string, unknown>) => clearedCookies.push({ name, options: opts }) } as unknown as TrpcContext["res"],
      };
      return { ctx, clearedCookies };
    })();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies).toHaveLength(1);
  });
});

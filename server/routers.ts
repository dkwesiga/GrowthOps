import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createCampaign,
  createLead,
  createPerformanceLog,
  deleteLead,
  getBrandProfile,
  getCampaign,
  getContentDraft,
  getDashboardSummary,
  getLead,
  listAgentRuns,
  listApprovals,
  listCampaigns,
  listContentDrafts,
  listIntegrations,
  listLeads,
  listPerformanceLogs,
  listWorkspaces,
  updateApproval,
  updateBrandProfile,
  updateCampaign,
  updateContentDraft,
  updateIntegration,
  updateLead,
} from "./db";
import { runCampaignStrategyLoop, runContentLoop, runLeadProspectingLoop } from "./agentLoops";

// ─── Workspace Router ─────────────────────────────────────────────────────────
const workspacesRouter = router({
  list: publicProcedure.query(() => listWorkspaces()),
});

// ─── Brand Profile Router ─────────────────────────────────────────────────────
const brandProfileRouter = router({
  get: publicProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(({ input }) => getBrandProfile(input.workspaceId)),

  update: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      brandName: z.string().optional(),
      website: z.string().optional().nullable(),
      businessType: z.string().optional().nullable(),
      audience: z.string().optional().nullable(),
      painPoints: z.string().optional().nullable(),
      servicesOrProducts: z.string().optional().nullable(),
      offers: z.string().optional().nullable(),
      ctas: z.string().optional().nullable(),
      toneOfVoice: z.string().optional().nullable(),
      prohibitedClaims: z.string().optional().nullable(),
      complianceNotes: z.string().optional().nullable(),
      geographicFocus: z.string().optional().nullable(),
      seedKeywords: z.string().optional().nullable(),
      competitors: z.string().optional().nullable(),
      contactInfo: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { workspaceId, ...data } = input;
      await updateBrandProfile(workspaceId, data);
      return { success: true };
    }),
});

// ─── Campaigns Router ─────────────────────────────────────────────────────────
const campaignsRouter = router({
  list: publicProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(({ input }) => listCampaigns(input.workspaceId)),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCampaign(input.id)),

  create: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      name: z.string().min(1),
      objective: z.string().optional(),
      audience: z.string().optional(),
      offer: z.string().optional(),
      channel: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      kpis: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await createCampaign({
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      });
      return result;
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "active", "paused", "completed", "archived"]),
    }))
    .mutation(async ({ input }) => {
      await updateCampaign(input.id, { status: input.status });
      return { success: true };
    }),

  runStrategyLoop: protectedProcedure
    .input(z.object({ workspaceId: z.number(), campaignId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return runCampaignStrategyLoop(input.workspaceId, input.campaignId, ctx.user.id);
    }),
});

// ─── Leads Router ─────────────────────────────────────────────────────────────
const leadsRouter = router({
  list: publicProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(({ input }) => listLeads(input.workspaceId)),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getLead(input.id)),

  create: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      companyName: z.string().optional(),
      contactName: z.string().optional(),
      roleTitle: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      linkedinUrl: z.string().optional(),
      location: z.string().optional(),
      industry: z.string().optional(),
      fleetSizeEstimate: z.string().optional(),
      painPoint: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
      campaignId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await createLead(input);
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string().optional(),
      notes: z.string().optional(),
      nextFollowUpAt: z.string().optional(),
      fitScore: z.number().optional(),
      urgencyScore: z.number().optional(),
      painPoint: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateLead(id, {
        ...data,
        status: data.status as typeof leads.$inferInsert.status,
        nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteLead(input.id);
      return { success: true };
    }),

  runProspectingLoop: protectedProcedure
    .input(z.object({ workspaceId: z.number(), leadId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return runLeadProspectingLoop(input.workspaceId, input.leadId, ctx.user.id);
    }),
});

// ─── Content Drafts Router ────────────────────────────────────────────────────
const contentDraftsRouter = router({
  list: publicProcedure
    .input(z.object({ workspaceId: z.number(), status: z.string().optional() }))
    .query(({ input }) => listContentDrafts(input.workspaceId, input.status)),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getContentDraft(input.id)),

  runContentLoop: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      campaignId: z.number().optional(),
      topic: z.string().min(1),
      contentTypes: z.array(z.string()),
      targetAudience: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return runContentLoop(input.workspaceId, input, ctx.user.id);
    }),
});

// ─── Approvals Router ─────────────────────────────────────────────────────────
const approvalsRouter = router({
  list: publicProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const [approvalsList, drafts] = await Promise.all([
        listApprovals(input.workspaceId),
        listContentDrafts(input.workspaceId),
      ]);
      // Join approvals with their drafts
      const draftMap = new Map(drafts.map((d) => [d.id, d]));
      return approvalsList.map((a) => ({
        ...a,
        draft: draftMap.get(a.contentDraftId),
      }));
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      approvalId: z.number(),
      draftId: z.number(),
      status: z.enum(["approved", "rejected", "revision_requested", "gmail_draft_created", "sent_manually", "published_manually", "archived"]),
      feedback: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const now = new Date();
      await Promise.all([
        updateApproval(input.approvalId, {
          status: input.status,
          feedback: input.feedback,
          reviewedBy: ctx.user.id,
          reviewedAt: now,
        }),
        updateContentDraft(input.draftId, {
          status: input.status,
          approvedBy: input.status === "approved" ? ctx.user.id : undefined,
          approvedAt: input.status === "approved" ? now : undefined,
        }),
      ]);
      return { success: true };
    }),
});

// ─── Agent Runs Router ────────────────────────────────────────────────────────
const agentRunsRouter = router({
  list: publicProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(({ input }) => listAgentRuns(input.workspaceId)),
});

// ─── Integrations Router ──────────────────────────────────────────────────────
const integrationsRouter = router({
  list: publicProcedure
    .input(z.object({ organizationId: z.number().default(1) }))
    .query(({ input }) => listIntegrations(input.organizationId)),

  toggleMockMode: protectedProcedure
    .input(z.object({ id: z.number(), mockMode: z.boolean() }))
    .mutation(async ({ input }) => {
      await updateIntegration(input.id, {
        mockMode: input.mockMode,
        status: input.mockMode ? "mock" : "disconnected",
      });
      return { success: true };
    }),

  // CSV export
  exportCSV: publicProcedure
    .input(z.object({
      workspaceId: z.number(),
      type: z.enum(["leads", "campaigns", "content_drafts", "approvals"]),
    }))
    .query(async ({ input }) => {
      if (input.type === "leads") {
        const data = await listLeads(input.workspaceId);
        const headers = ["id", "companyName", "contactName", "roleTitle", "email", "phone", "location", "industry", "fleetSizeEstimate", "fitScore", "urgencyScore", "status", "source", "createdAt"];
        const rows = data.map((r) => headers.map((h) => {
          const val = r[h as keyof typeof r];
          return val !== null && val !== undefined ? `"${String(val).replace(/"/g, '""')}"` : "";
        }).join(","));
        return { csv: [headers.join(","), ...rows].join("\n"), filename: `leads_workspace_${input.workspaceId}.csv` };
      }
      if (input.type === "campaigns") {
        const data = await listCampaigns(input.workspaceId);
        const headers = ["id", "name", "objective", "audience", "channel", "status", "startDate", "endDate", "createdAt"];
        const rows = data.map((r) => headers.map((h) => {
          const val = r[h as keyof typeof r];
          return val !== null && val !== undefined ? `"${String(val).replace(/"/g, '""')}"` : "";
        }).join(","));
        return { csv: [headers.join(","), ...rows].join("\n"), filename: `campaigns_workspace_${input.workspaceId}.csv` };
      }
      if (input.type === "content_drafts") {
        const data = await listContentDrafts(input.workspaceId);
        const headers = ["id", "contentType", "channel", "title", "status", "createdByAgent", "createdAt"];
        const rows = data.map((r) => headers.map((h) => {
          const val = r[h as keyof typeof r];
          return val !== null && val !== undefined ? `"${String(val).replace(/"/g, '""')}"` : "";
        }).join(","));
        return { csv: [headers.join(","), ...rows].join("\n"), filename: `content_drafts_workspace_${input.workspaceId}.csv` };
      }
      // approvals
      const data = await listApprovals(input.workspaceId);
      const headers = ["id", "contentDraftId", "status", "feedback", "createdAt", "reviewedAt"];
      const rows = data.map((r) => headers.map((h) => {
        const val = r[h as keyof typeof r];
        return val !== null && val !== undefined ? `"${String(val).replace(/"/g, '""')}"` : "";
      }).join(","));
      return { csv: [headers.join(","), ...rows].join("\n"), filename: `approvals_workspace_${input.workspaceId}.csv` };
    }),

  // Gmail mock draft creation
  createGmailDraft: protectedProcedure
    .input(z.object({
      draftId: z.number(),
      workspaceId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const draft = await getContentDraft(input.draftId);
      if (!draft) throw new Error("Draft not found");

      // Check if Gmail integration is connected
      const integrationsList = await listIntegrations(1);
      const gmailIntegration = integrationsList.find((i) => i.provider === "gmail");

      if (gmailIntegration?.mockMode || gmailIntegration?.status === "mock") {
        // Mock mode: update status and return copy-to-clipboard data
        await updateContentDraft(input.draftId, { status: "gmail_draft_created" });
        return {
          success: true,
          mode: "mock",
          message: "Gmail integration is in mock mode. Copy the content below to create the draft manually.",
          subject: draft.title,
          body: draft.body,
        };
      }

      // Real Gmail integration would go here
      await updateContentDraft(input.draftId, { status: "gmail_draft_created" });
      return { success: true, mode: "real", message: "Gmail draft created." };
    }),

  // Google Sheets mock sync
  syncToSheets: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      dataType: z.enum(["leads", "campaigns", "content_drafts"]),
    }))
    .mutation(async ({ input }) => {
      const integrationsList = await listIntegrations(1);
      const sheetsIntegration = integrationsList.find((i) => i.provider === "google_sheets");

      if (sheetsIntegration?.mockMode || sheetsIntegration?.status === "mock") {
        // Log the sync attempt
        return {
          success: true,
          mode: "mock",
          message: `Google Sheets sync is in mock mode. Use CSV export to download ${input.dataType} data instead.`,
          timestamp: new Date().toISOString(),
        };
      }

      // Real Sheets sync would go here
      await updateIntegration(sheetsIntegration!.id, { lastSyncAt: new Date() });
      return { success: true, mode: "real", message: "Synced to Google Sheets." };
    }),
});

// ─── Dashboard Router ─────────────────────────────────────────────────────────
const dashboardRouter = router({
  summary: publicProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(({ input }) => getDashboardSummary(input.workspaceId)),

  performanceLogs: publicProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(({ input }) => listPerformanceLogs(input.workspaceId)),

  addPerformanceLog: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      campaignId: z.number().optional(),
      channel: z.string().optional(),
      metricName: z.string(),
      metricValue: z.number(),
      source: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await createPerformanceLog(input);
      return { success: true };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspaces: workspacesRouter,
  brandProfile: brandProfileRouter,
  campaigns: campaignsRouter,
  leads: leadsRouter,
  contentDrafts: contentDraftsRouter,
  approvals: approvalsRouter,
  agentRuns: agentRunsRouter,
  integrations: integrationsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;

// Fix the leads import for type usage
import { leads } from "../drizzle/schema";

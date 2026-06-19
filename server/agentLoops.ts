import { invokeLLM } from "./_core/llm";
import {
  createAgentRun,
  createApproval,
  createContentDraft,
  getBrandProfile,
  getCampaign,
  getLead,
  updateAgentRun,
  updateCampaign,
  updateLead,
} from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function safeInvokeLLM(messages: Parameters<typeof invokeLLM>[0]["messages"], model?: string) {
  try {
    const response = await invokeLLM({ messages, model });
    const rawContent = response.choices?.[0]?.message?.content ?? "";
    const content: string = Array.isArray(rawContent)
      ? rawContent.map((p: { type: string; text?: string }) => (p.type === "text" ? p.text ?? "" : "")).join("")
      : String(rawContent);
    const usage = response.usage;
    return { content, usage, model: response.model ?? model ?? "unknown" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`LLM call failed: ${msg}`);
  }
}

function extractJSON(text: string): unknown {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[1] ?? match[0]);
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─── Loop 2: Campaign Strategy Loop ──────────────────────────────────────────
export async function runCampaignStrategyLoop(workspaceId: number, campaignId: number, userId?: number) {
  const runId = await createAgentRun({
    workspaceId,
    agentName: "CampaignStrategyAgent",
    loopName: "Campaign Strategy Loop",
    triggerType: "manual",
    inputJson: JSON.stringify({ campaignId }),
    status: "running",
  });

  try {
    const [campaign, brand] = await Promise.all([
      getCampaign(campaignId),
      getBrandProfile(workspaceId),
    ]);
    if (!campaign || !brand) throw new Error("Campaign or brand profile not found");

    const systemPrompt = `You are a senior marketing strategist and AI CMO assistant for ${brand.brandName}.
Brand voice: ${brand.toneOfVoice ?? "professional and trustworthy"}
Target audience: ${brand.audience ?? "general business audience"}
Services: ${brand.servicesOrProducts ?? "various services"}
Prohibited claims: ${brand.prohibitedClaims ?? "none specified"}
Compliance notes: ${brand.complianceNotes ?? "none"}
You must never invent testimonials, fake customer names, or make unverified claims.`;

    // Step 1: Generate campaign plan
    const planResult = await safeInvokeLLM([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Create a detailed campaign strategy plan for this campaign:
Campaign: ${campaign.name}
Objective: ${campaign.objective ?? "increase brand awareness"}
Audience: ${campaign.audience ?? brand.audience}
Offer: ${campaign.offer ?? "our services"}
Channel: ${campaign.channel ?? "multi-channel"}

Provide:
1. Campaign positioning statement
2. Key messages (3-5 bullet points)
3. Channel strategy
4. Content asset checklist (list each asset needed)
5. Success metrics / KPIs
6. Recommended timeline

Format as structured text.`,
      },
    ]);

    // Step 2: Generate first draft assets (LinkedIn + Email)
    const draftResult = await safeInvokeLLM([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Based on this campaign plan, create two first-draft content assets:

Campaign: ${campaign.name}
Plan summary: ${planResult.content.substring(0, 800)}

Asset 1: LinkedIn post (150-250 words, professional tone, ends with CTA)
Asset 2: Email subject line + email body (200-350 words, direct and conversion-focused)

Format your response as JSON:
{
  "linkedin": { "title": "...", "body": "...", "cta": "..." },
  "email": { "title": "Subject: ...", "body": "...", "cta": "..." }
}`,
      },
    ]);

    // Step 3: Self-critique
    const critiqueResult = await safeInvokeLLM([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Review these marketing drafts for:
- Accuracy and factual correctness
- Brand voice alignment
- Compliance risks
- Clarity and conversion strength
- Avoiding exaggerated claims

Drafts: ${draftResult.content}

Provide critique notes and a revised version of each draft.
Format as JSON:
{
  "linkedin": { "critiqueNotes": "...", "revisedTitle": "...", "revisedBody": "...", "revisedCta": "...", "riskNotes": "...", "rationale": "..." },
  "email": { "critiqueNotes": "...", "revisedTitle": "...", "revisedBody": "...", "revisedCta": "...", "riskNotes": "...", "rationale": "..." }
}`,
      },
    ]);

    const critiqueData = extractJSON(critiqueResult.content) as Record<string, {
      critiqueNotes?: string; revisedTitle?: string; revisedBody?: string;
      revisedCta?: string; riskNotes?: string; rationale?: string;
    }> | null;
    const draftData = extractJSON(draftResult.content) as Record<string, {
      title?: string; body?: string; cta?: string;
    }> | null;

    const createdDraftIds: number[] = [];

    // Save LinkedIn draft
    const linkedinDraft = await createContentDraft({
      workspaceId,
      campaignId,
      contentType: "linkedin_post",
      channel: "LinkedIn",
      title: critiqueData?.linkedin?.revisedTitle ?? draftData?.linkedin?.title ?? `${campaign.name} — LinkedIn Post`,
      body: critiqueData?.linkedin?.revisedBody ?? draftData?.linkedin?.body ?? draftResult.content,
      critiqueNotes: critiqueData?.linkedin?.critiqueNotes,
      aiRationale: critiqueData?.linkedin?.rationale,
      riskNotes: critiqueData?.linkedin?.riskNotes,
      cta: critiqueData?.linkedin?.revisedCta ?? draftData?.linkedin?.cta,
      status: "needs_review",
      createdByAgent: true,
    });

    // Save Email draft
    const emailDraft = await createContentDraft({
      workspaceId,
      campaignId,
      contentType: "email",
      channel: "Email",
      title: critiqueData?.email?.revisedTitle ?? draftData?.email?.title ?? `${campaign.name} — Email`,
      body: critiqueData?.email?.revisedBody ?? draftData?.email?.body ?? "",
      critiqueNotes: critiqueData?.email?.critiqueNotes,
      aiRationale: critiqueData?.email?.rationale,
      riskNotes: critiqueData?.email?.riskNotes,
      cta: critiqueData?.email?.revisedCta ?? draftData?.email?.cta,
      status: "needs_review",
      createdByAgent: true,
    });

    createdDraftIds.push(linkedinDraft.id, emailDraft.id);

    // Create approval entries
    await createApproval({ workspaceId, contentDraftId: linkedinDraft.id, requestedBy: userId, status: "needs_review" });
    await createApproval({ workspaceId, contentDraftId: emailDraft.id, requestedBy: userId, status: "needs_review" });

    // Update campaign with AI plan
    await updateCampaign(campaignId, {
      aiPlan: planResult.content,
      contentChecklist: `✓ LinkedIn post\n✓ Email draft\n○ Facebook post\n○ Blog article\n○ Ad copy`,
      status: "active",
    });

    const output = {
      planSummary: planResult.content.substring(0, 500),
      draftsCreated: ["LinkedIn post", "Email"],
      approvalsPending: 2,
    };

    await updateAgentRun(runId, {
      status: "completed",
      outputJson: JSON.stringify(output),
      modelUsed: planResult.model,
      tokenUsageJson: JSON.stringify({ plan: planResult.usage, draft: draftResult.usage }),
      createdRecordsJson: JSON.stringify({ draftIds: createdDraftIds }),
      completedAt: new Date(),
    });

    return output;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateAgentRun(runId, {
      status: "failed",
      errorMessage: msg,
      completedAt: new Date(),
    });
    throw err;
  }
}

// ─── Loop 3: Content Loop ─────────────────────────────────────────────────────
export async function runContentLoop(
  workspaceId: number,
  params: {
    campaignId?: number;
    topic: string;
    contentTypes: string[];
    targetAudience?: string;
  },
  userId?: number
) {
  const runId = await createAgentRun({
    workspaceId,
    agentName: "ContentAgent",
    loopName: "Content Loop",
    triggerType: "manual",
    inputJson: JSON.stringify(params),
    status: "running",
  });

  try {
    const brand = await getBrandProfile(workspaceId);
    if (!brand) throw new Error("Brand profile not found");

    const systemPrompt = `You are a senior content strategist for ${brand.brandName}.
Brand voice: ${brand.toneOfVoice ?? "professional"}
Audience: ${brand.audience ?? "business professionals"}
Services: ${brand.servicesOrProducts ?? "various services"}
CTAs: ${brand.ctas ?? "contact us"}
Prohibited claims: ${brand.prohibitedClaims ?? "none"}
Never invent testimonials, fake names, or unverified statistics.`;

    const contentTypeMap: Record<string, string> = {
      linkedin_post: "LinkedIn post (150-250 words)",
      facebook_post: "Facebook post (100-200 words, more casual)",
      email: "Email (subject line + 200-350 word body)",
      blog_outline: "Blog article outline (title, intro, 5 sections, conclusion)",
      ad_copy: "Ad copy (headline 8 words, body 30 words, CTA)",
    };

    const requestedTypes = params.contentTypes.filter((t) => contentTypeMap[t]);
    const draftsCreated: string[] = [];

    for (const contentType of requestedTypes) {
      // Generate draft
      const draftResult = await safeInvokeLLM([
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Write a ${contentTypeMap[contentType]} about: "${params.topic}"
Target audience: ${params.targetAudience ?? brand.audience ?? "general"}
Include a clear CTA aligned with: ${brand.ctas ?? "contact us"}`,
        },
      ]);

      // Self-critique and revise
      const critiqueResult = await safeInvokeLLM([
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Review this ${contentType} draft for accuracy, brand fit, compliance, clarity, and conversion strength. Then provide a revised version.

Draft: ${draftResult.content}

Respond as JSON:
{
  "critiqueNotes": "...",
  "revisedContent": "...",
  "riskNotes": "...",
  "rationale": "...",
  "suggestedCta": "..."
}`,
        },
      ]);

      const critique = extractJSON(critiqueResult.content) as {
        critiqueNotes?: string; revisedContent?: string; riskNotes?: string;
        rationale?: string; suggestedCta?: string;
      } | null;

      await createContentDraft({
        workspaceId,
        campaignId: params.campaignId,
        contentType: contentType as "linkedin_post" | "facebook_post" | "x_post" | "email" | "blog_outline" | "blog_article" | "seo_page" | "geo_answer_page" | "review_request" | "referral_request" | "ad_copy" | "landing_page_copy" | "thought_leadership_post",
        channel: contentType.replace("_post", "").replace("_", " "),
        title: `${params.topic} — ${contentType.replace(/_/g, " ")}`,
        body: critique?.revisedContent ?? draftResult.content,
        critiqueNotes: critique?.critiqueNotes,
        aiRationale: critique?.rationale,
        riskNotes: critique?.riskNotes,
        cta: critique?.suggestedCta ?? brand.ctas,
        status: "needs_review",
        createdByAgent: true,
      });

      draftsCreated.push(contentType);
    }

    const output = { draftsCreated, topic: params.topic };
    await updateAgentRun(runId, {
      status: "completed",
      outputJson: JSON.stringify(output),
      completedAt: new Date(),
    });

    return output;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateAgentRun(runId, {
      status: "failed",
      errorMessage: msg,
      completedAt: new Date(),
    });
    throw err;
  }
}

// ─── Loop 5: Lead/Prospecting Loop ────────────────────────────────────────────
export async function runLeadProspectingLoop(workspaceId: number, leadId: number, userId?: number) {
  const runId = await createAgentRun({
    workspaceId,
    agentName: "LeadProspectingAgent",
    loopName: "Lead Prospecting Loop",
    triggerType: "manual",
    inputJson: JSON.stringify({ leadId }),
    status: "running",
  });

  try {
    const [lead, brand] = await Promise.all([
      getLead(leadId),
      getBrandProfile(workspaceId),
    ]);
    if (!lead || !brand) throw new Error("Lead or brand profile not found");

    const systemPrompt = `You are a B2B sales and outreach specialist for ${brand.brandName}.
Brand voice: ${brand.toneOfVoice ?? "professional"}
Services: ${brand.servicesOrProducts ?? "various services"}
Prohibited: Do not invent facts about the prospect. Do not make unverified claims. Do not auto-send.`;

    // Step 1: Score and analyze
    const analysisResult = await safeInvokeLLM([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Analyze this prospect and provide scoring:

Company: ${lead.companyName ?? "Unknown"}
Contact: ${lead.contactName ?? "Unknown"} (${lead.roleTitle ?? "Unknown role"})
Location: ${lead.location ?? "Unknown"}
Industry: ${lead.industry ?? "Unknown"}
Fleet size: ${lead.fleetSizeEstimate ?? "Unknown"}
Known pain point: ${lead.painPoint ?? "Unknown"}
Source: ${lead.source ?? "Unknown"}

Our offering: ${brand.servicesOrProducts}
Our audience: ${brand.audience}

Provide:
1. Fit score (0-10): how well this prospect matches our ideal customer
2. Urgency score (0-10): how urgently they likely need our solution
3. Primary pain point hypothesis
4. Recommended outreach angle

Respond as JSON:
{
  "fitScore": 7.5,
  "urgencyScore": 6.0,
  "painPointHypothesis": "...",
  "outreachAngle": "..."
}`,
      },
    ]);

    const analysis = extractJSON(analysisResult.content) as {
      fitScore?: number; urgencyScore?: number;
      painPointHypothesis?: string; outreachAngle?: string;
    } | null;

    // Step 2: Draft outreach messages
    const outreachResult = await safeInvokeLLM([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Write three outreach messages for this prospect:

Prospect: ${lead.contactName ?? "there"} at ${lead.companyName ?? "your company"}
Pain point: ${analysis?.painPointHypothesis ?? lead.painPoint ?? "operational challenges"}
Outreach angle: ${analysis?.outreachAngle ?? "our solution can help"}
Our CTA: ${brand.ctas ?? "contact us"}

Message 1: Cold email (subject + 150-200 word body, professional, value-focused)
Message 2: LinkedIn connection message (under 300 characters)
Message 3: Follow-up email (if no reply after 5 days, 80-120 words)

Do NOT invent facts about the prospect. Do NOT promise specific outcomes.

Respond as JSON:
{
  "email": { "subject": "...", "body": "..." },
  "linkedin": { "message": "..." },
  "followUp": { "subject": "...", "body": "..." }
}`,
      },
    ]);

    // Step 3: Self-critique outreach
    const critiqueResult = await safeInvokeLLM([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Review these outreach messages for compliance, accuracy, tone, and conversion strength. Revise if needed.

Messages: ${outreachResult.content}

Respond as JSON:
{
  "email": { "critiqueNotes": "...", "revisedSubject": "...", "revisedBody": "...", "riskNotes": "..." },
  "linkedin": { "critiqueNotes": "...", "revisedMessage": "...", "riskNotes": "..." },
  "followUp": { "critiqueNotes": "...", "revisedSubject": "...", "revisedBody": "..." }
}`,
      },
    ]);

    const outreach = extractJSON(outreachResult.content) as Record<string, { subject?: string; body?: string; message?: string }> | null;
    const critique = extractJSON(critiqueResult.content) as Record<string, {
      critiqueNotes?: string; revisedSubject?: string; revisedBody?: string;
      revisedMessage?: string; riskNotes?: string;
    }> | null;

    // Update lead with scores
    await updateLead(leadId, {
      fitScore: analysis?.fitScore ?? null,
      urgencyScore: analysis?.urgencyScore ?? null,
      painPoint: analysis?.painPointHypothesis ?? lead.painPoint,
      status: "draft_ready",
    });

    // Save email draft
    await createContentDraft({
      workspaceId,
      leadId,
      contentType: "email",
      channel: "Email",
      title: critique?.email?.revisedSubject ?? outreach?.email?.subject ?? `Outreach: ${lead.companyName}`,
      body: critique?.email?.revisedBody ?? outreach?.email?.body ?? "",
      critiqueNotes: critique?.email?.critiqueNotes,
      riskNotes: critique?.email?.riskNotes,
      aiRationale: analysis?.outreachAngle,
      cta: brand.ctas,
      status: "needs_review",
      createdByAgent: true,
    });

    // Save LinkedIn draft
    await createContentDraft({
      workspaceId,
      leadId,
      contentType: "linkedin_post",
      channel: "LinkedIn",
      title: `LinkedIn: ${lead.contactName ?? lead.companyName}`,
      body: critique?.linkedin?.revisedMessage ?? outreach?.linkedin?.message ?? "",
      critiqueNotes: critique?.linkedin?.critiqueNotes,
      riskNotes: critique?.linkedin?.riskNotes,
      aiRationale: analysis?.outreachAngle,
      cta: brand.ctas,
      status: "needs_review",
      createdByAgent: true,
    });

    // Save follow-up draft
    await createContentDraft({
      workspaceId,
      leadId,
      contentType: "email",
      channel: "Email",
      title: critique?.followUp?.revisedSubject ?? outreach?.followUp?.subject ?? `Follow-up: ${lead.companyName}`,
      body: critique?.followUp?.revisedBody ?? outreach?.followUp?.body ?? "",
      aiRationale: "Follow-up message (5 days after initial contact)",
      status: "needs_review",
      createdByAgent: true,
    });

    const output = {
      fitScore: analysis?.fitScore,
      urgencyScore: analysis?.urgencyScore,
      painPoint: analysis?.painPointHypothesis,
      draftsCreated: ["Cold email", "LinkedIn message", "Follow-up email"],
    };

    await updateAgentRun(runId, {
      status: "completed",
      outputJson: JSON.stringify(output),
      modelUsed: analysisResult.model,
      completedAt: new Date(),
    });

    return output;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateAgentRun(runId, {
      status: "failed",
      errorMessage: msg,
      completedAt: new Date(),
    });
    throw err;
  }
}

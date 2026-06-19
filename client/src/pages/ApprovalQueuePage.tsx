import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Check, CheckSquare, Copy, Mail, MessageSquare, X } from "lucide-react";
import { Streamdown } from "streamdown";

const statusColors: Record<string, string> = {
  needs_review: "badge-review",
  approved: "badge-approved",
  rejected: "badge-rejected",
  revision_requested: "badge-review",
  gmail_draft_created: "badge-active",
  sent_manually: "badge-active",
  published_manually: "badge-active",
  archived: "badge-draft",
};

interface ApprovalWithDraft {
  id: number;
  contentDraftId: number;
  status: string;
  feedback: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  draft?: {
    id: number;
    title: string;
    body: string | null;
    contentType: string;
    channel: string | null;
    status: string;
    critiqueNotes: string | null;
    riskNotes: string | null;
    aiRationale: string | null;
    cta: string | null;
    createdByAgent: boolean;
  };
}

export default function ApprovalQueuePage() {
  const { activeWorkspace } = useWorkspace();
  const wsId = activeWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const [selectedApproval, setSelectedApproval] = useState<ApprovalWithDraft | null>(null);
  const [feedback, setFeedback] = useState("");
  const [statusFilter, setStatusFilter] = useState("needs_review");
  const [gmailResult, setGmailResult] = useState<{ subject: string; body: string } | null>(null);

  const { data: approvals = [], isLoading } = trpc.approvals.list.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );

  const updateStatusMutation = trpc.approvals.updateStatus.useMutation({
    onSuccess: () => {
      utils.approvals.list.invalidate({ workspaceId: wsId });
      utils.contentDrafts.list.invalidate({ workspaceId: wsId });
      utils.dashboard.summary.invalidate({ workspaceId: wsId });
      setSelectedApproval(null);
      setFeedback("");
      toast.success("Status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const gmailMutation = trpc.integrations.createGmailDraft.useMutation({
    onSuccess: (result) => {
      utils.approvals.list.invalidate({ workspaceId: wsId });
      if (result.mode === "mock") {
        setGmailResult({ subject: result.subject ?? "", body: result.body ?? "" });
        toast.info("Gmail in mock mode — copy content below");
      } else {
        toast.success("Gmail draft created");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAction = (
    approval: ApprovalWithDraft,
    status: "approved" | "rejected" | "revision_requested"
  ) => {
    updateStatusMutation.mutate({
      approvalId: approval.id,
      draftId: approval.contentDraftId,
      status,
      feedback: feedback || undefined,
    });
  };

  const handleGmailDraft = (approval: ApprovalWithDraft) => {
    gmailMutation.mutate({ draftId: approval.contentDraftId, workspaceId: wsId });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const filtered = approvals.filter((a) =>
    statusFilter === "all" ? true : a.status === statusFilter
  ) as ApprovalWithDraft[];

  const pendingCount = approvals.filter((a) => a.status === "needs_review").length;

  const filterTabs = [
    { id: "needs_review", label: `Pending (${pendingCount})` },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "revision_requested", label: "Revisions" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-primary" /> Approval Queue
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {activeWorkspace?.name} · {pendingCount} item{pendingCount !== 1 ? "s" : ""} pending review
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              statusFilter === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="w-12 h-12 text-green-400/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {statusFilter === "needs_review" ? "All caught up! No items pending review." : "No items in this category."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Approval list */}
          <div className="lg:col-span-2 space-y-2">
            {filtered.map((approval) => (
              <Card
                key={approval.id}
                className={cn(
                  "card-hover cursor-pointer",
                  selectedApproval?.id === approval.id && "border-primary/60 bg-primary/5"
                )}
                onClick={() => { setSelectedApproval(approval); setFeedback(approval.feedback ?? ""); setGmailResult(null); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{approval.draft?.title ?? `Draft #${approval.contentDraftId}`}</h3>
                        {approval.draft?.createdByAgent && <Bot className="w-3 h-3 text-primary flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={cn("text-[10px] h-4 px-1.5", statusColors[approval.status] ?? "badge-draft")}>
                          {approval.status?.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{approval.draft?.contentType?.replace(/_/g, " ")}</span>
                        {approval.draft?.channel && <span className="text-[10px] text-muted-foreground">· {approval.draft.channel}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{approval.draft?.body}</p>
                      {approval.feedback && (
                        <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> {approval.feedback}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {new Date(approval.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Review panel */}
          <div>
            {selectedApproval ? (
              <Card className="sticky top-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Review Draft</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Content preview */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Content</p>
                    <div className="text-xs bg-accent/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                      <Streamdown>{selectedApproval.draft?.body ?? ""}</Streamdown>
                    </div>
                  </div>

                  {selectedApproval.draft?.cta && (
                    <div>
                      <p className="text-xs text-muted-foreground">CTA</p>
                      <p className="text-xs">{selectedApproval.draft.cta}</p>
                    </div>
                  )}

                  {/* Copy full content button */}
                  <Button
                    variant="outline"
                    className="w-full h-8 text-xs"
                    onClick={() => copyToClipboard(selectedApproval.draft?.body ?? "")}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Content
                  </Button>

                  {selectedApproval.draft?.aiRationale && (
                    <div className="bg-accent/30 rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground font-medium mb-1">AI Rationale</p>
                      <p className="text-xs text-muted-foreground">{selectedApproval.draft.aiRationale}</p>
                    </div>
                  )}

                  {selectedApproval.draft?.critiqueNotes && (
                    <div className="bg-accent/30 rounded-lg p-2.5">
                      <p className="text-xs text-primary font-medium flex items-center gap-1 mb-1">
                        <Bot className="w-3 h-3" /> AI Critique
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedApproval.draft.critiqueNotes}</p>
                    </div>
                  )}

                  {selectedApproval.draft?.riskNotes && (
                    <div className="bg-yellow-500/10 rounded-lg p-2.5">
                      <p className="text-xs text-yellow-400 font-medium">⚠ Risk Notes</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedApproval.draft.riskNotes}</p>
                    </div>
                  )}

                  {/* Feedback */}
                  <div>
                    <Label className="text-xs">Feedback / Notes</Label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Optional feedback for the record..."
                      className="mt-1 min-h-[60px] text-xs"
                    />
                  </div>

                  {/* Action buttons */}
                  {selectedApproval.status === "needs_review" && (
                    <div className="space-y-2">
                      <Button
                        className="w-full h-8 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleAction(selectedApproval, "approved")}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-8 text-xs border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                        onClick={() => handleAction(selectedApproval, "revision_requested")}
                        disabled={updateStatusMutation.isPending}
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" /> Request Revision
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-8 text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => handleAction(selectedApproval, "rejected")}
                        disabled={updateStatusMutation.isPending}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}

                  {/* Gmail draft for approved email drafts */}
                  {selectedApproval.status === "approved" && selectedApproval.draft?.contentType === "email" && (
                    <Button
                      variant="outline"
                      className="w-full h-8 text-xs"
                      onClick={() => handleGmailDraft(selectedApproval)}
                      disabled={gmailMutation.isPending}
                    >
                      <Mail className="w-3.5 h-3.5 mr-1" /> Create Gmail Draft
                    </Button>
                  )}

                  {/* Gmail mock result */}
                  {gmailResult && (
                    <div className="bg-accent/30 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-yellow-400">Gmail Mock Mode — Copy manually:</p>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Subject:</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs flex-1">{gmailResult.subject}</p>
                          <button onClick={() => copyToClipboard(gmailResult.subject)}>
                            <Copy className="w-3 h-3 text-muted-foreground hover:text-primary" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Body:</p>
                        <div className="flex items-start gap-2">
                          <p className="text-xs flex-1 line-clamp-4">{gmailResult.body}</p>
                          <button onClick={() => copyToClipboard(gmailResult.body)}>
                            <Copy className="w-3 h-3 text-muted-foreground hover:text-primary" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Select an item to review</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

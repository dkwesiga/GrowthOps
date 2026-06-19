import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Layers, Loader2, Plus, Zap } from "lucide-react";
import { Streamdown } from "streamdown";

const statusColors: Record<string, string> = {
  draft: "badge-draft",
  active: "badge-active",
  paused: "badge-review",
  completed: "badge-approved",
  archived: "badge-draft",
};

function CampaignCard({ campaign, onRunLoop }: { campaign: Campaign; onRunLoop: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();
  const { activeWorkspace } = useWorkspace();

  const updateStatus = trpc.campaigns.updateStatus.useMutation({
    onSuccess: () => utils.campaigns.list.invalidate({ workspaceId: activeWorkspace?.id ?? 0 }),
  });

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{campaign.name}</h3>
              <Badge className={cn("text-[10px] h-4 px-1.5", statusColors[campaign.status] ?? "badge-draft")}>
                {campaign.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{campaign.objective ?? "No objective set"}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {campaign.channel && <span>📡 {campaign.channel}</span>}
              {campaign.audience && <span>👥 {campaign.audience.substring(0, 40)}...</span>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => onRunLoop(campaign.id)}
            >
              <Zap className="w-3 h-3 mr-1" /> Run AI Loop
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Hide" : "Details"}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            {campaign.aiPlan && (
              <div>
                <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                  <Bot className="w-3 h-3" /> AI Campaign Plan
                </p>
                <div className="text-xs bg-accent/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <Streamdown>{campaign.aiPlan}</Streamdown>
                </div>
              </div>
            )}
            {campaign.contentChecklist && (
              <div>
                <p className="text-xs font-medium text-primary mb-1">Content Checklist</p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{campaign.contentChecklist}</pre>
              </div>
            )}
            <div className="flex gap-2">
              {(["active", "paused", "completed"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={campaign.status === s ? "default" : "outline"}
                  className="h-6 text-[10px]"
                  onClick={() => updateStatus.mutate({ id: campaign.id, status: s })}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface Campaign {
  id: number;
  name: string;
  objective: string | null;
  audience: string | null;
  offer: string | null;
  channel: string | null;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  aiPlan: string | null;
  contentChecklist: string | null;
}

export default function CampaignsPage() {
  const { activeWorkspace } = useWorkspace();
  const wsId = activeWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [loopResult, setLoopResult] = useState<{ planSummary: string; draftsCreated: string[]; approvalsPending: number } | null>(null);

  const [form, setForm] = useState({
    name: "", objective: "", audience: "", offer: "", channel: "", notes: "",
  });

  const { data: campaigns = [], isLoading } = trpc.campaigns.list.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );

  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate({ workspaceId: wsId });
      setOpen(false);
      setForm({ name: "", objective: "", audience: "", offer: "", channel: "", notes: "" });
      toast.success("Campaign created");
    },
    onError: (e) => toast.error(e.message),
  });

  const runLoopMutation = trpc.campaigns.runStrategyLoop.useMutation({
    onSuccess: (result) => {
      setLoopResult(result);
      setRunningId(null);
      utils.campaigns.list.invalidate({ workspaceId: wsId });
      utils.contentDrafts.list.invalidate({ workspaceId: wsId });
      toast.success("Campaign Strategy Loop complete! Drafts sent to Approval Queue.");
    },
    onError: (e) => {
      setRunningId(null);
      toast.error(`Loop failed: ${e.message}`);
    },
  });

  const handleRunLoop = (campaignId: number) => {
    setRunningId(campaignId);
    setLoopResult(null);
    runLoopMutation.mutate({ workspaceId: wsId, campaignId });
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" /> Campaigns
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{activeWorkspace?.name}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Campaign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs">Campaign Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Annual Safety Inspection Campaign" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Objective</Label>
                <Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="What do you want to achieve?" className="mt-1 min-h-[60px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Target Audience</Label>
                  <Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Who is this for?" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Channel</Label>
                  <Input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="LinkedIn, Email, etc." className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Offer</Label>
                <Input value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} placeholder="What are you offering?" className="mt-1" />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate({ workspaceId: wsId, ...form })}
                disabled={!form.name || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loop result banner */}
      {loopResult && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-primary flex items-center gap-2">
              <Bot className="w-4 h-4" /> Campaign Strategy Loop Complete
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Created: {loopResult.draftsCreated.join(", ")} · {loopResult.approvalsPending} items pending approval
            </p>
          </CardContent>
        </Card>
      )}

      {/* Running indicator */}
      {runningId && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-yellow-400">Running Campaign Strategy Loop...</p>
              <p className="text-xs text-muted-foreground">Generating plan, content checklist, and first draft assets. This may take 30-60 seconds.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No campaigns yet</p>
            <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Create your first campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c as Campaign}
              onRunLoop={handleRunLoop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

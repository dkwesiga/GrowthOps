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
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Bot, Calendar, Loader2, Zap } from "lucide-react";
import { Streamdown } from "streamdown";

const statusColors: Record<string, string> = {
  draft: "badge-draft",
  needs_review: "badge-review",
  revision_requested: "badge-review",
  approved: "badge-approved",
  rejected: "badge-rejected",
  gmail_draft_created: "badge-active",
  sent_manually: "badge-active",
  published_manually: "badge-active",
  archived: "badge-draft",
};

const CONTENT_TYPES = [
  { id: "linkedin_post", label: "LinkedIn Post" },
  { id: "facebook_post", label: "Facebook Post" },
  { id: "email", label: "Email" },
  { id: "blog_outline", label: "Blog Outline" },
  { id: "ad_copy", label: "Ad Copy" },
];

export default function ContentCalendarPage() {
  const { activeWorkspace } = useWorkspace();
  const wsId = activeWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [form, setForm] = useState({
    topic: "",
    targetAudience: "",
    contentTypes: [] as string[],
  });

  const { data: drafts = [], isLoading } = trpc.contentDrafts.list.useQuery(
    { workspaceId: wsId, status: statusFilter === "all" ? undefined : statusFilter },
    { enabled: !!wsId }
  );

  const runLoopMutation = trpc.contentDrafts.runContentLoop.useMutation({
    onSuccess: (result) => {
      setRunning(false);
      setOpen(false);
      setForm({ topic: "", targetAudience: "", contentTypes: [] });
      utils.contentDrafts.list.invalidate({ workspaceId: wsId });
      toast.success(`Content Loop complete! Created: ${result.draftsCreated.join(", ")}`);
    },
    onError: (e) => {
      setRunning(false);
      toast.error(`Loop failed: ${e.message}`);
    },
  });

  const handleRunLoop = () => {
    if (!form.topic || form.contentTypes.length === 0) {
      toast.error("Please enter a topic and select at least one content type");
      return;
    }
    setRunning(true);
    runLoopMutation.mutate({ workspaceId: wsId, ...form });
  };

  const toggleContentType = (id: string) => {
    setForm((f) => ({
      ...f,
      contentTypes: f.contentTypes.includes(id)
        ? f.contentTypes.filter((t) => t !== id)
        : [...f.contentTypes, id],
    }));
  };

  const selectedDraftData = drafts.find((d) => d.id === selectedDraft);

  const filterTabs = ["all", "needs_review", "approved", "rejected", "published_manually"];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" /> Content Calendar
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{activeWorkspace?.name}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Zap className="w-4 h-4 mr-1" /> Run Content Loop</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" /> AI Content Loop
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs">Topic / Theme *</Label>
                <Input
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder="e.g. Fleet safety inspection tips"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Target Audience (optional)</Label>
                <Input
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  placeholder="e.g. Fleet managers in Queensland"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs mb-2 block">Content Types *</Label>
                <div className="space-y-2">
                  {CONTENT_TYPES.map((ct) => (
                    <div key={ct.id} className="flex items-center gap-2">
                      <Checkbox
                        id={ct.id}
                        checked={form.contentTypes.includes(ct.id)}
                        onCheckedChange={() => toggleContentType(ct.id)}
                      />
                      <Label htmlFor={ct.id} className="text-xs cursor-pointer">{ct.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-accent/30 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">What happens:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>AI generates a draft for each selected content type</li>
                  <li>AI self-critiques each draft for accuracy and compliance</li>
                  <li>Revised drafts are saved to the Approval Queue</li>
                </ol>
              </div>
              <Button
                className="w-full"
                onClick={handleRunLoop}
                disabled={running || !form.topic || form.contentTypes.length === 0}
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                {running ? "Running AI Loop..." : "Generate Content"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              statusFilter === tab
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {tab === "all" ? "All Drafts" : tab.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : drafts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No content drafts yet</p>
            <p className="text-xs text-muted-foreground mt-1">Run the Content Loop or Campaign Strategy Loop to generate drafts</p>
            <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>
              <Zap className="w-4 h-4 mr-1" /> Run Content Loop
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Draft list */}
          <div className="lg:col-span-2 space-y-2">
            {drafts.map((draft) => (
              <Card
                key={draft.id}
                className={cn("card-hover cursor-pointer", selectedDraft === draft.id && "border-primary/60 bg-primary/5")}
                onClick={() => setSelectedDraft(selectedDraft === draft.id ? null : draft.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{draft.title}</h3>
                        {draft.createdByAgent && (
                          <Bot className="w-3 h-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={cn("text-[10px] h-4 px-1.5", statusColors[draft.status] ?? "badge-draft")}>
                          {draft.status?.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{draft.contentType?.replace(/_/g, " ")}</span>
                        {draft.channel && <span className="text-[10px] text-muted-foreground">· {draft.channel}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{draft.body}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {new Date(draft.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Draft detail */}
          <div>
            {selectedDraftData ? (
              <Card className="sticky top-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Draft Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Title</p>
                    <p className="text-sm font-medium">{selectedDraftData.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Content</p>
                    <div className="text-xs bg-accent/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                      <Streamdown>{selectedDraftData.body ?? ""}</Streamdown>
                    </div>
                  </div>
                  {selectedDraftData.cta && (
                    <div>
                      <p className="text-xs text-muted-foreground">CTA</p>
                      <p className="text-xs">{selectedDraftData.cta}</p>
                    </div>
                  )}
                  {selectedDraftData.critiqueNotes && (
                    <div>
                      <p className="text-xs text-primary font-medium flex items-center gap-1">
                        <Bot className="w-3 h-3" /> AI Critique Notes
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{selectedDraftData.critiqueNotes}</p>
                    </div>
                  )}
                  {selectedDraftData.riskNotes && (
                    <div className="bg-yellow-500/10 rounded-lg p-2">
                      <p className="text-xs text-yellow-400 font-medium">⚠ Risk Notes</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedDraftData.riskNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Select a draft to preview</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

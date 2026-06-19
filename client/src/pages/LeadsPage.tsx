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
import { Bot, Loader2, Plus, Users, Zap } from "lucide-react";

const statusColors: Record<string, string> = {
  new: "badge-draft",
  researched: "badge-review",
  scored: "badge-review",
  draft_ready: "badge-approved",
  approved_for_contact: "badge-approved",
  contacted_manually: "badge-active",
  replied: "badge-active",
  booked: "badge-active",
  not_fit: "badge-rejected",
  follow_up_later: "badge-review",
  closed_won: "badge-approved",
  closed_lost: "badge-rejected",
};

const LEAD_STATUSES = [
  "new", "researched", "scored", "draft_ready", "approved_for_contact",
  "contacted_manually", "replied", "booked", "not_fit", "follow_up_later",
  "closed_won", "closed_lost",
];

export default function LeadsPage() {
  const { activeWorkspace } = useWorkspace();
  const wsId = activeWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<number | null>(null);

  const [form, setForm] = useState({
    companyName: "", contactName: "", roleTitle: "", email: "", phone: "",
    location: "", industry: "", fleetSizeEstimate: "", painPoint: "", source: "", notes: "",
  });

  const { data: leads = [], isLoading } = trpc.leads.list.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );

  const { data: selectedLeadDrafts = [] } = trpc.contentDrafts.list.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );

  const createMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate({ workspaceId: wsId });
      setOpen(false);
      setForm({ companyName: "", contactName: "", roleTitle: "", email: "", phone: "", location: "", industry: "", fleetSizeEstimate: "", painPoint: "", source: "", notes: "" });
      toast.success("Lead added");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.leads.update.useMutation({
    onSuccess: () => utils.leads.list.invalidate({ workspaceId: wsId }),
  });

  const deleteMutation = trpc.leads.delete.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate({ workspaceId: wsId });
      setSelectedLead(null);
      toast.success("Lead removed");
    },
  });

  const runLoopMutation = trpc.leads.runProspectingLoop.useMutation({
    onSuccess: (result) => {
      setRunningId(null);
      utils.leads.list.invalidate({ workspaceId: wsId });
      utils.contentDrafts.list.invalidate({ workspaceId: wsId });
      toast.success(`Prospecting loop complete! Fit: ${result.fitScore?.toFixed(1)}/10, Urgency: ${result.urgencyScore?.toFixed(1)}/10`);
    },
    onError: (e) => {
      setRunningId(null);
      toast.error(`Loop failed: ${e.message}`);
    },
  });

  const handleRunLoop = (leadId: number) => {
    setRunningId(leadId);
    runLoopMutation.mutate({ workspaceId: wsId, leadId });
  };

  const leadDraftsForSelected = selectedLeadDrafts.filter((d) => (d as { leadId?: number }).leadId === selectedLead);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Leads & Prospects
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{activeWorkspace?.name}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Lead</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Lead / Prospect</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Company Name</Label>
                  <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Contact Name</Label>
                  <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Role / Title</Label>
                  <Input value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Industry</Label>
                  <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Fleet Size Estimate</Label>
                  <Input value={form.fleetSizeEstimate} onChange={(e) => setForm({ ...form, fleetSizeEstimate: e.target.value })} placeholder="e.g. 10 trucks" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Known Pain Point</Label>
                <Textarea value={form.painPoint} onChange={(e) => setForm({ ...form, painPoint: e.target.value })} className="mt-1 min-h-[60px]" />
              </div>
              <div>
                <Label className="text-xs">Source</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="LinkedIn, referral, manual, etc." className="mt-1" />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate({ workspaceId: wsId, ...form })}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Lead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No leads yet</p>
            <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add your first lead
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead list */}
          <div className="lg:col-span-2 space-y-2">
            {leads.map((lead) => (
              <Card
                key={lead.id}
                className={cn("card-hover cursor-pointer", selectedLead === lead.id && "border-primary/60 bg-primary/5")}
                onClick={() => setSelectedLead(selectedLead === lead.id ? null : lead.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{lead.companyName ?? "Unknown company"}</h3>
                        <Badge className={cn("text-[10px] h-4 px-1.5", statusColors[lead.status] ?? "badge-draft")}>
                          {lead.status?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lead.contactName} {lead.roleTitle ? `· ${lead.roleTitle}` : ""} {lead.location ? `· ${lead.location}` : ""}
                      </p>
                      {lead.painPoint && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">💡 {lead.painPoint}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {lead.fitScore !== null && lead.fitScore !== undefined && (
                          <span className="text-xs text-primary font-medium">Fit: {lead.fitScore.toFixed(1)}/10</span>
                        )}
                        {lead.urgencyScore !== null && lead.urgencyScore !== undefined && (
                          <span className="text-xs text-yellow-400 font-medium">Urgency: {lead.urgencyScore.toFixed(1)}/10</span>
                        )}
                        {lead.fleetSizeEstimate && (
                          <span className="text-xs text-muted-foreground">🚛 {lead.fleetSizeEstimate}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={runningId === lead.id}
                        onClick={(e) => { e.stopPropagation(); handleRunLoop(lead.id); }}
                      >
                        {runningId === lead.id ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Zap className="w-3 h-3 mr-1" />
                        )}
                        Prospect
                      </Button>
                      <Select
                        value={lead.status}
                        onValueChange={(v) => { updateMutation.mutate({ id: lead.id, status: v }); }}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lead detail panel */}
          <div className="space-y-3">
            {selectedLead ? (
              <>
                {(() => {
                  const lead = leads.find((l) => l.id === selectedLead);
                  if (!lead) return null;
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Lead Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        {lead.email && <p><span className="text-muted-foreground">Email:</span> {lead.email}</p>}
                        {lead.phone && <p><span className="text-muted-foreground">Phone:</span> {lead.phone}</p>}
                        {lead.website && <p><span className="text-muted-foreground">Website:</span> {lead.website}</p>}
                        {lead.linkedinUrl && <p><span className="text-muted-foreground">LinkedIn:</span> <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary">{lead.linkedinUrl}</a></p>}
                        {lead.industry && <p><span className="text-muted-foreground">Industry:</span> {lead.industry}</p>}
                        {lead.source && <p><span className="text-muted-foreground">Source:</span> {lead.source}</p>}
                        {lead.notes && <p><span className="text-muted-foreground">Notes:</span> {lead.notes}</p>}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 text-[10px] mt-2"
                          onClick={() => deleteMutation.mutate({ id: lead.id })}
                        >
                          Delete Lead
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })()}

                {leadDraftsForSelected.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Bot className="w-3.5 h-3.5 text-primary" /> Outreach Drafts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {leadDraftsForSelected.map((d) => (
                        <div key={d.id} className="p-2.5 rounded-lg bg-accent/30 text-xs">
                          <p className="font-medium">{d.title}</p>
                          <p className="text-muted-foreground mt-0.5">{d.contentType?.replace(/_/g, " ")} · {d.status}</p>
                          <p className="mt-1 line-clamp-3 text-muted-foreground">{d.body}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Select a lead to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Layers,
  Lightbulb,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  needs_review: "badge-review",
  approved: "badge-approved",
  rejected: "badge-rejected",
  draft: "badge-draft",
  active: "badge-active",
  running: "badge-review",
  completed: "badge-approved",
  failed: "badge-rejected",
  new: "badge-draft",
};

function StatCard({ title, value, icon: Icon, color, href }: {
  title: string; value: number | string; icon: React.ElementType; color: string; href: string;
}) {
  return (
    <Link href={href}>
      <Card className="card-hover cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{title}</p>
              <p className={cn("text-2xl font-bold mt-0.5", color)}>{value}</p>
            </div>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color.replace("text-", "bg-") + "/10")}>
              <Icon className={cn("w-5 h-5", color)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const { activeWorkspace } = useWorkspace();
  const wsId = activeWorkspace?.id ?? 0;

  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a workspace to get started.</p>
      </div>
    );
  }

  const aiRecommendations = [
    { icon: Lightbulb, text: `Run Campaign Strategy Loop for "${activeWorkspace.name}" to generate first content assets`, href: "/campaigns" },
    { icon: Users, text: "Score and draft outreach for new leads using the Lead Prospecting Loop", href: "/leads" },
    { icon: Zap, text: "Review pending content drafts in the Approval Queue before publishing", href: "/approvals" },
    { icon: TrendingUp, text: "Add performance metrics to track campaign effectiveness", href: "/campaigns" },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Today's Growth Tasks
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {activeWorkspace.name} — {new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Pending Approvals"
            value={summary?.pendingApprovals?.length ?? 0}
            icon={CheckCircle2}
            color="text-yellow-400"
            href="/approvals"
          />
          <StatCard
            title="Active Campaigns"
            value={summary?.activeCampaigns?.length ?? 0}
            icon={Layers}
            color="text-primary"
            href="/campaigns"
          />
          <StatCard
            title="New Leads"
            value={summary?.newLeads?.length ?? 0}
            icon={Users}
            color="text-green-400"
            href="/leads"
          />
          <StatCard
            title="Ready Drafts"
            value={summary?.readyDrafts?.length ?? 0}
            icon={CheckCircle2}
            color="text-cyan-400"
            href="/content"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Recommendations */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {aiRecommendations.map((rec, i) => (
              <Link key={i} href={rec.href}>
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group">
                  <rec.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">{rec.text}</p>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/50 mt-0.5 flex-shrink-0 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                Pending Approvals
              </span>
              <Link href="/approvals">
                <span className="text-xs text-primary hover:underline">View all</span>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
            ) : summary?.pendingApprovals?.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              summary?.pendingApprovals?.slice(0, 4).map((draft) => (
                <Link key={draft.id} href="/approvals">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{draft.title}</p>
                      <p className="text-[10px] text-muted-foreground">{draft.contentType?.replace(/_/g, " ")}</p>
                    </div>
                    <Badge className={cn("text-[10px] h-4 px-1.5", statusColors[draft.status] ?? "badge-draft")}>
                      {draft.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Agent Runs */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Recent Agent Runs
              </span>
              <Link href="/agent-runs">
                <span className="text-xs text-primary hover:underline">View all</span>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
            ) : summary?.recentRuns?.length === 0 ? (
              <div className="text-center py-4">
                <Bot className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No agent runs yet</p>
                <p className="text-[10px] text-muted-foreground mt-1">Run a campaign or lead loop to get started</p>
              </div>
            ) : (
              summary?.recentRuns?.slice(0, 4).map((run) => (
                <div key={run.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{run.agentName}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(run.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={cn("text-[10px] h-4 px-1.5", statusColors[run.status] ?? "badge-draft")}>
                    {run.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads needing follow-up */}
      {(summary?.newLeads?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" />
                Leads Needing Attention
              </span>
              <Link href="/leads">
                <Button variant="ghost" size="sm" className="h-6 text-xs">View all <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary?.newLeads?.slice(0, 3).map((lead) => (
                <Link key={lead.id} href="/leads">
                  <div className="p-3 rounded-lg border border-border/50 hover:border-primary/40 cursor-pointer transition-all hover:bg-accent/20">
                    <p className="text-sm font-medium">{lead.companyName ?? "Unknown company"}</p>
                    <p className="text-xs text-muted-foreground">{lead.contactName} · {lead.roleTitle}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{lead.painPoint ?? "No pain point recorded"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="badge-draft text-[10px] h-4 px-1.5">{lead.status}</Badge>
                      {lead.fitScore && (
                        <span className="text-[10px] text-primary">Fit: {lead.fitScore}/10</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

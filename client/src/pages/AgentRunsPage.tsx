import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Streamdown } from "streamdown";

const statusColors: Record<string, string> = {
  running: "badge-review",
  completed: "badge-approved",
  failed: "badge-rejected",
  pending: "badge-draft",
};

const statusIcons: Record<string, React.ElementType> = {
  running: Clock,
  completed: CheckCircle2,
  failed: XCircle,
  pending: Clock,
};

export default function AgentRunsPage() {
  const { activeWorkspace } = useWorkspace();
  const wsId = activeWorkspace?.id ?? 0;
  const [selectedRun, setSelectedRun] = useState<number | null>(null);

  const { data: runs = [], isLoading } = trpc.agentRuns.list.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );

  const selectedRunData = runs.find((r) => r.id === selectedRun);

  const formatDuration = (start: Date, end: Date | null) => {
    if (!end) return "In progress";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" /> Agent Runs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {activeWorkspace?.name} · Full audit log of all AI loop executions
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No agent runs yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run a Campaign Strategy Loop, Content Loop, or Lead Prospecting Loop to see results here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Run list */}
          <div className="lg:col-span-2 space-y-2">
            {runs.map((run) => {
              const StatusIcon = statusIcons[run.status] ?? Clock;
              return (
                <Card
                  key={run.id}
                  className={cn("card-hover cursor-pointer", selectedRun === run.id && "border-primary/60 bg-primary/5")}
                  onClick={() => setSelectedRun(selectedRun === run.id ? null : run.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                          run.status === "completed" ? "bg-green-500/10" :
                          run.status === "failed" ? "bg-destructive/10" : "bg-yellow-500/10"
                        )}>
                          <StatusIcon className={cn(
                            "w-4 h-4",
                            run.status === "completed" ? "text-green-400" :
                            run.status === "failed" ? "text-destructive" : "text-yellow-400"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm">{run.agentName}</h3>
                            <Badge className={cn("text-[10px] h-4 px-1.5", statusColors[run.status] ?? "badge-draft")}>
                              {run.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{run.loopName}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(run.createdAt).toLocaleString()}
                            </span>
                            {run.completedAt && (
                              <span>Duration: {formatDuration(run.createdAt, run.completedAt)}</span>
                            )}
                            {run.modelUsed && <span>Model: {run.modelUsed}</span>}
                          </div>
                          {run.status === "failed" && run.errorMessage && (
                            <p className="text-xs text-destructive mt-1 line-clamp-1">Error: {run.errorMessage}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        #{run.id}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Run detail */}
          <div>
            {selectedRunData ? (
              <Card className="sticky top-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Run Details #{selectedRunData.id}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Agent</p>
                    <p className="font-medium">{selectedRunData.agentName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Loop</p>
                    <p>{selectedRunData.loopName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trigger</p>
                    <p>{selectedRunData.triggerType}</p>
                  </div>
                  {selectedRunData.modelUsed && (
                    <div>
                      <p className="text-muted-foreground">Model</p>
                      <p>{selectedRunData.modelUsed}</p>
                    </div>
                  )}
                  {selectedRunData.inputJson && (
                    <div>
                      <p className="text-muted-foreground mb-1">Input</p>
                      <pre className="bg-accent/30 rounded p-2 text-[10px] overflow-x-auto">
                        {JSON.stringify(JSON.parse(selectedRunData.inputJson), null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedRunData.outputJson && (
                    <div>
                      <p className="text-muted-foreground mb-1">Output</p>
                      <pre className="bg-accent/30 rounded p-2 text-[10px] overflow-x-auto">
                        {JSON.stringify(JSON.parse(selectedRunData.outputJson), null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedRunData.errorMessage && (
                    <div className="bg-destructive/10 rounded-lg p-2.5">
                      <p className="text-destructive font-medium">Error</p>
                      <p className="text-muted-foreground mt-0.5">{selectedRunData.errorMessage}</p>
                    </div>
                  )}
                  {selectedRunData.tokenUsageJson && (
                    <div>
                      <p className="text-muted-foreground mb-1">Token Usage</p>
                      <pre className="bg-accent/30 rounded p-2 text-[10px] overflow-x-auto">
                        {JSON.stringify(JSON.parse(selectedRunData.tokenUsageJson), null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Bot className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Select a run to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

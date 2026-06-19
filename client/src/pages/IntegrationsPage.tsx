import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileSpreadsheet, Loader2, Mail, RefreshCw, Zap } from "lucide-react";

const statusColors: Record<string, string> = {
  connected: "badge-approved",
  disconnected: "badge-rejected",
  mock: "badge-review",
  error: "badge-rejected",
};

const providerIcons: Record<string, React.ElementType> = {
  google_sheets: FileSpreadsheet,
  gmail: Mail,
};

const providerLabels: Record<string, string> = {
  google_sheets: "Google Sheets",
  gmail: "Gmail",
};

export default function IntegrationsPage() {
  const { activeWorkspace } = useWorkspace();
  const wsId = activeWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const [syncingType, setSyncingType] = useState<string | null>(null);
  const [exportingType, setExportingType] = useState<string | null>(null);

  const { data: integrations = [], isLoading } = trpc.integrations.list.useQuery(
    { organizationId: 1 },
    { enabled: !!wsId }
  );

  const toggleMockMutation = trpc.integrations.toggleMockMode.useMutation({
    onSuccess: () => {
      utils.integrations.list.invalidate({ organizationId: 1 });
      toast.success("Integration mode updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const syncMutation = trpc.integrations.syncToSheets.useMutation({
    onSuccess: (result) => {
      setSyncingType(null);
      if (result.mode === "mock") {
        toast.info(result.message);
      } else {
        toast.success(result.message);
      }
    },
    onError: (e) => {
      setSyncingType(null);
      toast.error(e.message);
    },
  });

  const { refetch: exportLeads } = trpc.integrations.exportCSV.useQuery(
    { workspaceId: wsId, type: "leads" },
    { enabled: false }
  );
  const { refetch: exportCampaigns } = trpc.integrations.exportCSV.useQuery(
    { workspaceId: wsId, type: "campaigns" },
    { enabled: false }
  );
  const { refetch: exportDrafts } = trpc.integrations.exportCSV.useQuery(
    { workspaceId: wsId, type: "content_drafts" },
    { enabled: false }
  );
  const { refetch: exportApprovals } = trpc.integrations.exportCSV.useQuery(
    { workspaceId: wsId, type: "approvals" },
    { enabled: false }
  );

  const handleExportCSV = async (type: "leads" | "campaigns" | "content_drafts" | "approvals") => {
    setExportingType(type);
    try {
      const refetchFn = { leads: exportLeads, campaigns: exportCampaigns, content_drafts: exportDrafts, approvals: exportApprovals }[type];
      const result = await refetchFn();
      const data = result.data;
      if (!data) throw new Error("No data");
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${type.replace(/_/g, " ")} CSV`);
    } catch (e) {
      toast.error("Export failed");
    } finally {
      setExportingType(null);
    }
  };

  const handleSync = (dataType: "leads" | "campaigns" | "content_drafts") => {
    setSyncingType(dataType);
    syncMutation.mutate({ workspaceId: wsId, dataType });
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" /> Integrations
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Connect external tools or use mock/fallback modes
        </p>
      </div>

      {/* Integration status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading ? (
          [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
        ) : (
          integrations.map((integration) => {
            const Icon = providerIcons[integration.provider] ?? Zap;
            const label = providerLabels[integration.provider] ?? integration.provider;
            return (
              <Card key={integration.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{label}</h3>
                        <Badge className={cn("text-[10px] h-4 px-1.5 mt-1", statusColors[integration.status] ?? "badge-draft")}>
                          {integration.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">Mock Mode</Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {integration.mockMode
                          ? "Using fallback — no real API calls"
                          : "Live mode — requires credentials"}
                      </p>
                    </div>
                    <Switch
                      checked={integration.mockMode ?? false}
                      onCheckedChange={(checked) =>
                        toggleMockMutation.mutate({ id: integration.id, mockMode: checked })
                      }
                    />
                  </div>

                  {integration.lastSyncAt && (
                    <p className="text-[10px] text-muted-foreground mt-3">
                      Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
                    </p>
                  )}

                  {integration.provider === "google_sheets" && (
                    <div className="mt-3 space-y-1.5">
                      {(["leads", "campaigns", "content_drafts"] as const).map((type) => (
                        <Button
                          key={type}
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs"
                          disabled={syncingType === type}
                          onClick={() => handleSync(type)}
                        >
                          {syncingType === type ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="w-3 h-3 mr-1" />
                          )}
                          Sync {type.replace(/_/g, " ")}
                        </Button>
                      ))}
                    </div>
                  )}

                  {integration.provider === "gmail" && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">
                        Gmail drafts are created from the Approval Queue for approved email drafts.
                        {integration.mockMode && " In mock mode, content is shown for manual copy."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* CSV Export section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> CSV Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Download data as CSV files for use in spreadsheets, CRMs, or reporting tools.
            Always available regardless of integration status.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["leads", "campaigns", "content_drafts", "approvals"] as const).map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                className="h-9 text-xs flex-col gap-0.5"
                disabled={exportingType === type}
                onClick={() => handleExportCSV(type)}
              >
                {exportingType === type ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {type.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration setup note */}
      <Card className="border-dashed border-border/50">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Adding Real Integrations</p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            To connect real Google Sheets or Gmail accounts, OAuth credentials and scopes need to be configured
            server-side. Toggle mock mode off and add your API credentials via the Settings page.
            Until then, mock mode provides full fallback functionality with CSV export and clipboard copy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

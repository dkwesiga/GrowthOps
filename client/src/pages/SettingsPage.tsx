import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Building2, Info } from "lucide-react";

export default function SettingsPage() {
  const { activeWorkspace, workspaces } = useWorkspace();
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Platform configuration and account info</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {user ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span>{user.name ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{user.email ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge className={user.role === "admin" ? "badge-approved" : "badge-draft"}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Login Method</span>
                  <span>{user.loginMethod ?? "—"}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-xs">Not signed in</p>
            )}
          </CardContent>
        </Card>

        {/* Workspaces */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Workspaces
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className={`flex items-center justify-between p-2.5 rounded-lg ${
                  activeWorkspace?.id === ws.id ? "bg-primary/10 border border-primary/30" : "bg-accent/30"
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{ws.name}</p>
                  <p className="text-xs text-muted-foreground">{ws.type?.replace(/_/g, " ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  {activeWorkspace?.id === ws.id && (
                    <Badge className="badge-active text-[10px] h-4 px-1.5">active</Badge>
                  )}
                  <Badge className={ws.status === "active" ? "badge-approved" : "badge-draft"}>
                    {ws.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Platform Info */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> Platform Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Platform</p>
                <p className="font-medium">GrowthOps AI</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Version</p>
                <p className="font-medium">1.0.0 MVP</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">AI Loops</p>
                <p className="font-medium">Campaign · Content · Leads</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Integrations</p>
                <p className="font-medium">Google Sheets · Gmail</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-accent/30 rounded-lg text-xs text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground mb-1">About GrowthOps AI</p>
              <p>
                GrowthOps AI is a human-in-the-loop AI marketing and growth platform. All AI-generated content
                goes through a self-critique and revision step before being saved, and requires human approval
                before any outreach or publishing action. The platform never auto-sends emails or auto-publishes
                content without explicit approval.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

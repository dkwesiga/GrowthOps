import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import WorkspacePage from "./pages/WorkspacePage";
import CampaignsPage from "./pages/CampaignsPage";
import LeadsPage from "./pages/LeadsPage";
import ContentCalendarPage from "./pages/ContentCalendarPage";
import ApprovalQueuePage from "./pages/ApprovalQueuePage";
import AgentRunsPage from "./pages/AgentRunsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import SettingsPage from "./pages/SettingsPage";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/workspace" component={WorkspacePage} />
        <Route path="/campaigns" component={CampaignsPage} />
        <Route path="/leads" component={LeadsPage} />
        <Route path="/content" component={ContentCalendarPage} />
        <Route path="/approvals" component={ApprovalQueuePage} />
        <Route path="/agent-runs" component={AgentRunsPage} />
        <Route path="/integrations" component={IntegrationsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <WorkspaceProvider>
            <Toaster richColors position="top-right" />
            <Router />
          </WorkspaceProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

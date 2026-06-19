import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { trpc } from "@/lib/trpc";
import { bridgeSupabaseSession, supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
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

// Keeps our app session cookie in sync with the Supabase session: bridges on
// initial load / sign-in / token refresh (including the redirect back from
// social login) and clears the cached user on sign-out.
function AuthBridge() {
  const utils = trpc.useUtils();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        const ok = await bridgeSupabaseSession();
        if (ok) await utils.auth.me.invalidate();
      } else if (event === "SIGNED_OUT") {
        utils.auth.me.setData(undefined, null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [utils]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <WorkspaceProvider>
            <Toaster richColors position="top-right" />
            <AuthBridge />
            <Switch>
              <Route path="/login" component={Login} />
              <Route>
                <Router />
              </Route>
            </Switch>
          </WorkspaceProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

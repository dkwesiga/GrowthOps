import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bot,
  Briefcase,
  Calendar,
  CheckSquare,
  ChevronDown,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { trpc } from "@/lib/trpc";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/workspace", label: "Brand Profile", icon: Briefcase },
  { path: "/campaigns", label: "Campaigns", icon: Layers },
  { path: "/leads", label: "Leads", icon: Users },
  { path: "/content", label: "Content Calendar", icon: Calendar },
  { path: "/approvals", label: "Approval Queue", icon: CheckSquare },
  { path: "/agent-runs", label: "Agent Runs", icon: Bot },
  { path: "/integrations", label: "Integrations", icon: Zap },
  { path: "/settings", label: "Settings", icon: Settings },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();

  // Count pending approvals for badge
  const { data: approvalData } = trpc.approvals.list.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace }
  );
  const pendingCount = approvalData?.filter((a) => a.status === "needs_review").length ?? 0;

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <span className="font-bold text-sm gradient-text">GrowthOps</span>
          <span className="text-xs text-muted-foreground block -mt-0.5">AI Platform</span>
        </div>
      </div>

      {/* Workspace Selector */}
      <div className="px-3 py-3 border-b border-border/50">
        <p className="text-xs text-muted-foreground px-2 mb-1.5 uppercase tracking-wider font-medium">Workspace</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  activeWorkspace?.type === "b2b_saas" ? "bg-primary" : "bg-green-400"
                )} />
                <span className="truncate font-medium text-foreground">{activeWorkspace?.name ?? "Select workspace"}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => setActiveWorkspace(ws)}
                className={cn("cursor-pointer", activeWorkspace?.id === ws.id && "bg-primary/10 text-primary")}
              >
                <div className={cn("w-2 h-2 rounded-full mr-2", ws.type === "b2b_saas" ? "bg-primary" : "bg-green-400")} />
                {ws.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <Link key={path} href={path}>
              <div
                className={cn("nav-item", isActive && "active")}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {path === "/approvals" && pendingCount > 0 && (
                  <Badge className="h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
                    {pendingCount}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-border/50">
        {isAuthenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-medium truncate">{user.name ?? "User"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email ?? user.role}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <a href={getLoginUrl()}>
            <Button size="sm" className="w-full">Sign in</Button>
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm gradient-text">GrowthOps AI</span>
          </div>
          <div className="ml-auto">
            <span className="text-xs text-muted-foreground">{activeWorkspace?.name}</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

interface Workspace {
  id: number;
  name: string;
  type: string;
  status: string;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (ws: Workspace) => void;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  activeWorkspace: null,
  setActiveWorkspace: () => {},
  isLoading: true,
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: workspaces = [], isLoading } = trpc.workspaces.list.useQuery();
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);

  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspace) {
      const saved = localStorage.getItem("growthops_workspace_id");
      const found = saved ? workspaces.find((w) => w.id === parseInt(saved)) : null;
      setActiveWorkspaceState(found ?? workspaces[0]);
    }
  }, [workspaces, activeWorkspace]);

  const setActiveWorkspace = (ws: Workspace) => {
    setActiveWorkspaceState(ws);
    localStorage.setItem("growthops_workspace_id", String(ws.id));
  };

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setActiveWorkspace, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

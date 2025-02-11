// components/users/ProjectsPanel.tsx
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from '@/lib/apis/config';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, Plus, ArrowUpRight, MoreVertical, Pencil } from "lucide-react";
import { SidePanel } from "../SidePanel";
import { ProjectActionDialog } from "./ProjectActionDialog";

interface Project {
  id: string;
  name: string;
  totalImages?: number;
  annotatedImages?: number;
  remainingImages?: number;
}

interface ProjectsPanelProps {
  open: boolean;
  onClose: () => void;
  username?: string;
}

type DialogState = {
  type: 'create-project' | 'rename-project' | null;
  project?: Project;
};

export function ProjectsPanel({ open, onClose, username }: ProjectsPanelProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({ type: null });

  const fetchProjects = useCallback(async () => {
    if (!username) return;
    
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/projects/${username}`);
      setProjects(response.projects);
    } catch {
      toast.error("Failed to fetch user projects");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (open && username) {
      void fetchProjects();
    }
  }, [open, username, fetchProjects]);

  const handleProjectClick = (e: React.MouseEvent, projectId: string) => {
    // Prevent navigation if clicking the dropdown
    if ((e.target as HTMLElement).closest('.project-actions')) {
      e.stopPropagation();
      return;
    }
    
    router.push(`/admin/users/projects?projectId=${encodeURIComponent(projectId)}&username=${encodeURIComponent(username || '')}`);
    onClose();
  };

  const handleCreateProject = useCallback(async (username: string, projectName: string) => {
    try {
      await fetchWithAuth(`/auth/users/${username}/projects`, {
        method: 'POST',
        body: JSON.stringify({ projectName })
      });
      
      toast.success("Project created successfully");
      void fetchProjects();
      return true;
    } catch {
      toast.error("Failed to create project");
      return false;
    }
  }, [fetchProjects]);

  const handleRenameProject = useCallback(async (username: string, projectId: string, newName: string) => {
    try {
      await fetchWithAuth(
        `/auth/users/${username}/projects/${projectId}`, 
        {
          method: 'PUT',
          body: JSON.stringify({ newName })
        }
      );
      
      toast.success("Project renamed successfully");
      void fetchProjects();
      return true;
    } catch {
      toast.error("Failed to rename project");
      return false;
    }
  }, [fetchProjects]);

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={`Projects - ${username}`}
        onRefresh={fetchProjects}
        actionButtons={
          <Button
            variant="default"
            size="sm"
            onClick={() => setDialogState({ type: 'create-project' })}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No projects found
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="p-4 hover:bg-accent cursor-pointer transition-colors group"
                onClick={(e) => handleProjectClick(e, project.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-2">
                      {project.name}
                      <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {project.totalImages !== undefined && (
                      <div className="text-sm text-muted-foreground">
                        {project.annotatedImages} / {project.totalImages} images annotated
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {project.totalImages !== undefined && project.annotatedImages !== undefined && (
                      <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ 
                            width: `${(project.annotatedImages / project.totalImages) * 100}%`
                          }} 
                        />
                      </div>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="project-actions h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDialogState({ 
                              type: 'rename-project',
                              project,
                            });
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </SidePanel>

      <ProjectActionDialog
        state={dialogState}
        username={username}
        onClose={() => setDialogState({ type: null })}
        onAction={{
          createProject: handleCreateProject,
          renameProject: handleRenameProject,
        }}
      />
    </>
  );
}
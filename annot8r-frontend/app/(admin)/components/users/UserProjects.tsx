// app/(admin)/components/users/UserProjects.tsx
import { useCallback, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { UserInfo, Project } from "@/lib/types/users";
import { getAssignedProjects } from "@/lib/apis/projects";

interface UserProjectsProps {
  user: UserInfo;
}

export function UserProjects({ user }: UserProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAssignedProjects(user.username);
      setProjects(response);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to fetch user projects");
    } finally {
      setLoading(false);
    }
  }, [user.username]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="ios-loader" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No projects assigned to this user
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {projects.map((project) => {
          const completionRate = 
            project.totalImages && project.annotatedImages
              ? Math.round((project.annotatedImages / project.totalImages) * 100)
              : 0;

          return (
            <div
              key={project.id}
              className="border rounded-lg p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium">{project.name}</h3>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <Progress value={completionRate} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Images</p>
                  <p className="font-medium">{project.totalImages ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Annotated</p>
                  <p className="font-medium">{project.annotatedImages ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-medium">{project.remainingImages ?? 0}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
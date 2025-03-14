// components/admin/dashboard/recent-projects.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Project, ProjectStatus } from "@/lib/types";
import { getRecentProjects } from "@/lib/api/admin-dashboard";
import { cn } from "@/lib/utils";

export function RecentProjects() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getRecentProjects(5);
        if (response.success && response.data) {
          setProjects(response.data);
        } else {
          setError(response.error || "Failed to fetch recent projects");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.CREATED:
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">New</Badge>;
      case ProjectStatus.IN_PROGRESS:
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">In Progress</Badge>;
      case ProjectStatus.COMPLETED:
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      case ProjectStatus.ARCHIVED:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">Archived</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const navigateToProject = (projectId: string) => {
    router.push(`/admin/projects/${projectId}`);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>Recent Projects</CardTitle>
        <CardDescription>Latest projects across your organization</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>Failed to load recent projects</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No projects found</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => router.push("/admin/projects/new")}
            >
              Create a new project
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {projects.map((project) => (
              <div
                key={project.id}
                className="pb-4 last:pb-0 border-b last:border-0 cursor-pointer"
                onClick={() => navigateToProject(project.id)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-medium">{project.name}</h3>
                  {getStatusBadge(project.status)}
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                </div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span>Completion</span>
                  <span className="font-medium">{project.completionPercentage}%</span>
                </div>
                <Progress
                  value={project.completionPercentage}
                  className={cn(
                    "h-1.5",
                    project.completionPercentage < 30 
                      ? "bg-red-100" 
                      : project.completionPercentage < 70 
                      ? "bg-yellow-100" 
                      : "bg-green-100"
                  )}
                />
                <div className="flex justify-end mt-2">
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    View Details <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
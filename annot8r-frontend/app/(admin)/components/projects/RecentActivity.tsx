// app/(admin)/components/projects/RecentActivity.tsx
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import type { Project } from "@/lib/types/project";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecentActivityProps {
  loading: boolean;
  projects: Project[];
}

export function RecentActivity({ loading, projects }: RecentActivityProps) {
  const activities = useMemo(() => {
    return projects
      .map((project) => ({
        projectId: project.id,
        projectName: project.name,
        activity: "Last updated",
        timestamp: project.stats.lastActivity instanceof Date 
          ? project.stats.lastActivity 
          : new Date(project.stats.lastActivity),
        details: `${project.stats.completedImages} images completed`,
      }))
      .filter((activity) => {
        // Ensure timestamp is a valid date
        return !isNaN(activity.timestamp.getTime());
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }, [projects]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-[60px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {activities.map((activity, i) => (
          <div
            key={`${activity.projectId}-${i}`}
            className="flex items-center justify-between py-2"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{activity.projectName}</p>
              <p className="text-sm text-muted-foreground">
                {activity.details}
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
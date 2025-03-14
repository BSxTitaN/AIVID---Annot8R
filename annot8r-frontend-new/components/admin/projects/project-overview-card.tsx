/* eslint-disable jsx-a11y/alt-text */
import { useRouter } from "next/navigation";
import { Project, ProjectStatus } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Folder,
  FolderCheck,
  FolderCog,
  FolderArchive,
  FolderPlus,
  Image,
  Users,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ProjectOverviewCardProps {
  project: Project;
}

export function ProjectOverviewCard({ project }: ProjectOverviewCardProps) {
  const router = useRouter();

  const handleProjectClick = () => {
    router.push(`/admin/projects/${project.id}`);
  };

  // Status icon and badge configuration
  const getStatusConfig = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.CREATED:
        return {
          icon: FolderPlus,
          color: "text-blue-500",
          badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          label: "Created",
        };
      case ProjectStatus.IN_PROGRESS:
        return {
          icon: FolderCog,
          color: "text-yellow-500",
          badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
          label: "In Progress",
        };
      case ProjectStatus.COMPLETED:
        return {
          icon: FolderCheck,
          color: "text-green-500",
          badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
          label: "Completed",
        };
      case ProjectStatus.ARCHIVED:
        return {
          icon: FolderArchive,
          color: "text-gray-500",
          badge: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
          label: "Archived",
        };
      default:
        return {
          icon: Folder,
          color: "text-gray-500",
          badge: "bg-gray-100 text-gray-800",
          label: "Unknown",
        };
    }
  };

  const statusConfig = getStatusConfig(project.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card 
      className="overflow-hidden transition-all hover:shadow-md cursor-pointer border-l-4"
      style={{ 
        borderLeftColor: project.status === ProjectStatus.CREATED 
          ? "#3b82f6" 
          : project.status === ProjectStatus.IN_PROGRESS 
            ? "#eab308" 
            : project.status === ProjectStatus.COMPLETED 
              ? "#22c55e" 
              : "#6b7280" 
      }}
      onClick={handleProjectClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <StatusIcon className={cn("h-5 w-5 mr-2", statusConfig.color)} />
            <CardTitle className="text-lg truncate max-w-[200px]" title={project.name}>
              {project.name}
            </CardTitle>
          </div>
          <Badge className={statusConfig.badge}>
            {statusConfig.label}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 h-10">
          {project.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{project.completionPercentage}%</span>
          </div>
          <Progress value={project.completionPercentage} className="h-2" />
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-1">
              <Image className="h-4 w-4 text-muted-foreground" />
              <span>{project.totalImages} images</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>0 members</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 text-xs text-muted-foreground">
        <div className="flex items-center">
          <Calendar className="h-3.5 w-3.5 mr-1" />
          Updated {project.updatedAt ? formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true }) : "recently"}
        </div>
      </CardFooter>
    </Card>
  );
}
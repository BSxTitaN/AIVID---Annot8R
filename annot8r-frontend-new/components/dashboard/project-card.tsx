"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Clock,
  Folder,
  FolderOpen,
  Image,
  LayoutDashboard,
  LucideIcon,
} from "lucide-react";
import { Project, ProjectStatus } from "@/lib/types";
import { checkProjectCompletionStatus } from "@/lib/api/user-projects";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const handleViewProject = async () => {
    setIsChecking(true);

    try {
      // Check if project is completed before navigating
      const completionResponse = await checkProjectCompletionStatus(project.id);

      if (completionResponse.success && completionResponse.data) {
        if (completionResponse.data.isCompleted) {
          toast.info(
            completionResponse.data.message || "Project already completed",
            {
              description:
                "All images have been annotated and approved for this project.",
            }
          );
          setIsChecking(false);
          return;
        }
      }

      // Navigate to project detail page
      router.push(`/dashboard/projects/${project.id}`);
    } catch (error) {
      console.error("Error checking project completion:", error);
      // Navigate anyway on error, we'll check again on the detail page
      router.push(`/dashboard/projects/${project.id}`);
    } finally {
      setIsChecking(false);
    }
  };

  // Define status badge and icon based on project status
  const getStatusConfig = (
    status: ProjectStatus
  ): {
    badge: string;
    badgeColor: string;
    icon: LucideIcon;
    iconColor: string;
  } => {
    switch (status) {
      case ProjectStatus.CREATED:
        return {
          badge: "New",
          badgeColor:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          icon: Folder,
          iconColor: "text-blue-500",
        };
      case ProjectStatus.IN_PROGRESS:
        return {
          badge: "In Progress",
          badgeColor:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
          icon: FolderOpen,
          iconColor: "text-yellow-500",
        };
      case ProjectStatus.COMPLETED:
        return {
          badge: "Completed",
          badgeColor:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
          icon: CheckCircle,
          iconColor: "text-green-500",
        };
      case ProjectStatus.ARCHIVED:
        return {
          badge: "Archived",
          badgeColor:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
          icon: Folder,
          iconColor: "text-gray-500",
        };
      default:
        return {
          badge: "Unknown",
          badgeColor: "bg-gray-100 text-gray-800",
          icon: Folder,
          iconColor: "text-gray-500",
        };
    }
  };

  const statusConfig = getStatusConfig(project.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <StatusIcon className={cn("h-5 w-5 mr-2", statusConfig.iconColor)} />
          <Badge className={statusConfig.badgeColor}>
            {statusConfig.badge}
          </Badge>
        </div>
        <CardTitle className="mt-2 text-xl">{project.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {project.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center text-muted-foreground">
              <Image className="h-4 w-4 mr-1" />
              <span>{project.totalImages} images</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-4 w-4 mr-1" />
              <span>
                {project.updatedAt
                  ? formatDistanceToNow(new Date(project.updatedAt), {
                      addSuffix: true,
                    })
                  : "Recently updated"}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Completion</span>
              <span>{project.completionPercentage}%</span>
            </div>
            <Progress
              value={Number(project?.completionPercentage || 0)}
              className="h-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Annotated</span>
              <span className="font-medium">
                {project.annotatedImages} / {project.totalImages}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Reviewed</span>
              <span className="font-medium">
                {project.reviewedImages} / {project.totalImages}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          className="w-full"
          onClick={handleViewProject}
          disabled={isChecking || project.status === ProjectStatus.ARCHIVED}
        >
          {isChecking ? (
            <>
              <span className="animate-spin mr-2">
                <Clock className="h-4 w-4" />
              </span>
              Checking...
            </>
          ) : (
            <>
              <LayoutDashboard className="h-4 w-4 mr-2" />
              View Project
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

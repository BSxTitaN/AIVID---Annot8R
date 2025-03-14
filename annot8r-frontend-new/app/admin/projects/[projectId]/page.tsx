// app/(admin)/admin/projects/[projectId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProject } from "@/lib/api/projects";
import { Project, ProjectStatus } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Check,
  LayoutDashboard,
  Settings,
  Users,
  Image as ImageIcon,
  ClipboardList,
  Folder,
  FolderCheck,
  FolderCog,
  FolderArchive,
  FolderPlus,
} from "lucide-react";
import { ProjectOverview } from "@/components/admin/projects/project-detail/project-overview";
import { ProjectMembers } from "@/components/admin/projects/project-detail/project-members";
import { ProjectImages } from "@/components/admin/projects/project-detail/project-images";
import { ProjectSettings } from "@/components/admin/projects/project-detail/project-settings";
import { ProjectSubmissions } from "@/components/admin/projects/project-detail/project-submissions";
import { ProjectExport } from "@/components/admin/projects/project-detail/project-export"; // Import the new component
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const projectId = params.projectId as string;

  useEffect(() => {
    const fetchProjectDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getProject(projectId);
        if (response.success && response.data) {
          setProject(response.data);
        } else {
          setError(response.error || "Failed to fetch project details");
          toast.error("Error loading project", {
            description: response.error || "Failed to fetch project details",
          });
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        toast.error("Error", { description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjectDetails();
  }, [projectId]);

  const getStatusConfig = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.CREATED:
        return {
          icon: FolderPlus,
          color: "text-blue-500",
          badge:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          label: "Created",
        };
      case ProjectStatus.IN_PROGRESS:
        return {
          icon: FolderCog,
          color: "text-yellow-500",
          badge:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
          label: "In Progress",
        };
      case ProjectStatus.COMPLETED:
        return {
          icon: FolderCheck,
          color: "text-green-500",
          badge:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
          label: "Completed",
        };
      case ProjectStatus.ARCHIVED:
        return {
          icon: FolderArchive,
          color: "text-gray-500",
          badge:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
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

  if (error === "Project not found") {
    router.push("/admin/projects/not-found");
    return null;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="mr-4"
          onClick={() => router.push("/admin/projects")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Back to Projects</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </div>

      {/* Project header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-60" />
              <Skeleton className="h-4 w-full max-w-md" />
            </>
          ) : project ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const statusConfig = getStatusConfig(project.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <>
                      <StatusIcon
                        className={cn("h-5 w-5", statusConfig.color)}
                      />
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
                        {project.name}
                      </h1>
                      <Badge className={statusConfig.badge}>
                        {statusConfig.label}
                      </Badge>
                    </>
                  );
                })()}
              </div>
              <p className="text-muted-foreground line-clamp-2">{project.description}</p>
              <div className="flex items-center text-xs text-muted-foreground pt-1">
                <Calendar className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                {project.updatedAt
                  ? `Updated ${formatDistanceToNow(
                      new Date(project.updatedAt),
                      { addSuffix: true }
                    )}`
                  : "Recently created"}
              </div>
            </>
          ) : (
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Project Not Found
            </h1>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-2 lg:mt-0">
          {!isLoading && project && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={project.status === ProjectStatus.ARCHIVED}
                className="text-xs sm:text-sm"
              >
                <Check className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">
                  {project.status === ProjectStatus.COMPLETED
                    ? "Mark as In Progress"
                    : "Mark as Completed"}
                </span>
                <span className="sm:hidden">
                  {project.status === ProjectStatus.COMPLETED ? "In Progress" : "Complete"}
                </span>
              </Button>
              
              {/* Export Button */}
              {project.totalImages > 0 && <ProjectExport project={project} />}
              
              <Button
                variant="default"
                size="sm"
                onClick={() => setActiveTab("images")}
                className="text-xs sm:text-sm"
              >
                <ImageIcon className="h-4 w-4 mr-1 sm:mr-2" />
                <span>Upload Images</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Project stats cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : project ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Images
              </h3>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{project.totalImages}</p>
            <div className="mt-1 text-xs text-muted-foreground">
              {project.annotatedImages} annotated (
              {project.totalImages > 0
                ? `${Math.round(
                    (project.annotatedImages / project.totalImages) * 100
                  )}%`
                : "0%"}
              )
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Reviewed
              </h3>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{project.reviewedImages}</p>
            <div className="mt-1 text-xs text-muted-foreground">
              {project.approvedImages} approved (
              {project.reviewedImages > 0
                ? `${Math.round(
                    (project.approvedImages / project.reviewedImages) * 100
                  )}%`
                : "0%"}
              )
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Completion
              </h3>
              <FolderCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">
              {project.completionPercentage}%
            </p>
            <div className="mt-1 text-xs text-muted-foreground">
              Overall project completion
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                Classes
              </h3>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">
              {project?.classes?.length || 0}
            </p>
            <div className="mt-1 text-xs text-muted-foreground">
              {project?.allowCustomClasses
                ? "Custom classes allowed"
                : "Fixed class set"}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : project ? (
        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <div className="overflow-x-auto">
            <TabsList className="h-10 sm:h-12 inline-flex min-w-max">
              <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <LayoutDashboard className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Users className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span>Members</span>
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <ImageIcon className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span>Images</span>
              </TabsTrigger>
              <TabsTrigger value="submissions" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <ClipboardList className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span>Submissions</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Settings className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-4 sm:mt-6">
            <TabsContent value="overview">
              {project && <ProjectOverview project={project} />}
            </TabsContent>
            <TabsContent value="members">
              {project && <ProjectMembers projectId={project.id} />}
            </TabsContent>
            <TabsContent value="images">
              {project && <ProjectImages projectId={project.id} />}
            </TabsContent>
            <TabsContent value="submissions">
              {project && <ProjectSubmissions projectId={project.id} />}
            </TabsContent>
            <TabsContent value="settings">
              {project && (
                <ProjectSettings project={project} onUpdate={setProject} />
              )}
            </TabsContent>
          </div>
        </Tabs>
      ) : null}
    </div>
  );
}
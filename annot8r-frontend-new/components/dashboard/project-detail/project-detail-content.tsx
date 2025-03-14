"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  CheckCircle,
  ClipboardList,
  Clock,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import {
  Project,
  SubmissionStatus,
  ProjectStatus,
  ProjectStats,
} from "@/lib/types";
import { getUserProject, getUserProjectStats } from "@/lib/api/user-projects";
import { ImagesTab } from "@/components/dashboard/project-detail/images-tab";
import { SubmissionsTab } from "@/components/dashboard/project-detail/submissions-tab";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCompletionNotice } from "@/components/dashboard/project-detail/project-completion-notice";

interface ProjectDetailContentProps {
  projectId: string;
  activeTab: "images" | "submissions";
}

export default function ProjectDetailContent({
  projectId,
  activeTab = "images",
}: ProjectDetailContentProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [currentTab, setCurrentTab] = useState<string>(activeTab);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProjectCompleted, setIsProjectCompleted] = useState(false);

  const fetchProjectDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const projectResponse = await getUserProject(projectId);
      if (!projectResponse.success || !projectResponse.data) {
        throw new Error(
          projectResponse.error || "Failed to load project details"
        );
      }
      setProject(projectResponse.data);

      // Check if project is completed
      if (projectResponse.data.status === ProjectStatus.COMPLETED) {
        setIsProjectCompleted(true);
      }

      const statsResponse = await getUserProjectStats(projectId);
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        console.warn("Failed to load project statistics:", statsResponse.error);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error("Error loading project", { description: errorMessage });
      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("not exist")
      ) {
        router.push(`/dashboard/projects/${projectId}/not-found`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  useEffect(() => {
    router.push(`/dashboard/projects/${projectId}?tab=${currentTab}`, {
      scroll: false,
    });
  }, [currentTab, projectId, router]);

  const handleRefresh = useCallback(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  const canSubmitForReview = stats
    ? stats.unannotated === 0 &&
      stats.totalAssigned > 0 &&
      !stats.submissions.some(
        (s) =>
          s.status === SubmissionStatus.SUBMITTED ||
          s.status === SubmissionStatus.UNDER_REVIEW
      )
    : false;

  if (isLoading) {
    return <ProjectLoadingSkeleton />;
  }

  if (error || !project) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-2">Error Loading Project</h2>
        <p className="text-muted-foreground mb-4">
          {error || "Project could not be loaded"}
        </p>
        <Button onClick={() => router.push("/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        heading={project.name}
        subheading={project.description || "No description provided"}
      />

      {/* Show project completion notice if project is completed */}
      {isProjectCompleted && (
        <ProjectCompletionNotice projectName={project.name} />
      )}

      <div className="space-y-8">
        {/* Project Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Assigned Images
              </CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalAssigned || 0}
              </div>
              {stats && stats.totalAssigned > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Completion</span>
                    <span>{stats?.progress ?? 0}%</span>
                  </div>
                  <Progress value={Number(stats?.progress || 0)} className="h-1.5" />
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annotated</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.annotated || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.unannotated || 0} remaining
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Under Review
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.pendingReview || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.rejected || 0} rejected
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.approved || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats && stats.totalAssigned > 0
                  ? Math.round((stats.approved / stats.totalAssigned) * 100)
                  : 0}
                % completion rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Refresh button */}
        {!isProjectCompleted && (
          <div className="flex justify-end">
            <Button onClick={handleRefresh} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}

        {/* Content tabs - Only show if project is not completed */}
        {!isProjectCompleted ? (
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList>
              <TabsTrigger value="images" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span>Images</span>
              </TabsTrigger>
              <TabsTrigger
                value="submissions"
                className="flex items-center gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                <span>Submissions</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="images" className="mt-6">
              <ImagesTab
                projectId={projectId}
                stats={stats}
                canSubmitForReview={canSubmitForReview}
                onRefreshStats={handleRefresh}
              />
            </TabsContent>
            <TabsContent value="submissions" className="mt-6">
              <SubmissionsTab
                projectId={projectId}
                canSubmitForReview={canSubmitForReview}
                assignments={stats?.assignments || []}
                onRefreshStats={handleRefresh}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Project History</CardTitle>
            </CardHeader>
            <CardContent>
              <SubmissionsTab
                projectId={projectId}
                canSubmitForReview={false}
                assignments={stats?.assignments || []}
                onRefreshStats={handleRefresh}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function ProjectLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-full" />
      {/* Content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

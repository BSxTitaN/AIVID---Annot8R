import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import ProjectDetailContent from "@/components/dashboard/project-detail/project-detail-content";
import { requireAuthentication } from "@/lib/utils/auth-utils";
import { checkProjectCompletionStatus } from "@/lib/api/user-projects";

export const metadata: Metadata = {
  title: "Project Details - Annotation Platform",
  description: "View and manage your annotation project",
};

interface ProjectDetailPageProps {
  params: {
    projectId: string;
  };
  searchParams: {
    tab?: string;
  };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  // Ensure user is authenticated
  await requireAuthentication();
  
  const { projectId } = params;
  const tab = searchParams.tab || "images";

  // Check if project is completed - this is necessary server-side to avoid redirecting unnecessarily
  try {
    const completionResponse = await checkProjectCompletionStatus(projectId);
    if (completionResponse.success && completionResponse.data && completionResponse.data.isCompleted) {
      redirect(
        "/dashboard?completed=true&message=" +
          encodeURIComponent(completionResponse.data.message || "Project already completed")
      );
    }
  } catch (error) {
    console.error("Error checking project completion status:", error);
    // Don't redirect on error, let the client-side component handle it
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" className="mr-4" asChild>
          <a href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </a>
        </Button>
      </div>
      
      <Suspense fallback={<ProjectDetailSkeleton />}>
        <ProjectDetailContent projectId={projectId} activeTab={tab as "images" | "submissions"} />
      </Suspense>
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Placeholder for project header */}
      <div className="h-10 w-3/4 bg-muted rounded animate-pulse"></div>
      <div className="h-5 w-1/2 bg-muted rounded animate-pulse"></div>
      
      {/* Placeholder for stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      
      {/* Placeholder for tab navigation */}
      <Skeleton className="h-12 w-full" />
      
      {/* Placeholder for content area */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}
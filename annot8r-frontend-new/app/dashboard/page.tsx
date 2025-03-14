import { Suspense } from "react";
import { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardContent from "@/components/dashboard/dashboard-content";
import { requireAuthentication } from "@/lib/utils/auth-utils";

export const metadata: Metadata = {
  title: "Dashboard - Annotation Platform",
  description: "View and manage your annotation projects",
};

interface DashboardPageProps {
  searchParams: {
    completed?: string;
    message?: string;
  };
}

export default async function DashboardPage({ 
  searchParams 
}: DashboardPageProps) {
  // Ensure user is authenticated
  await requireAuthentication();
  
  // Check for project completion notification from URL parameters
  const showCompletionNotice = searchParams.completed === "true";
  const completionMessage = searchParams.message || "Project completed successfully";

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Dashboard"
        subheading="View and manage your annotation projects"
      />
      
      {showCompletionNotice && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                {decodeURIComponent(completionMessage)}
              </p>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      
      {/* Activity section skeleton */}
      <Skeleton className="h-64 w-full" />
      
      {/* Projects section skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
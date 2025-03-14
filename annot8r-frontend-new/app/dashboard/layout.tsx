import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Suspense } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: {
    projectId?: string;
  };
}

export default function DashboardLayout({ 
  children,
  params
}: DashboardLayoutProps) {
  const projectId = params?.projectId;
  
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav projectId={projectId} />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
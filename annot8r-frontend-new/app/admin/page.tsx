// app/(admin)/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getDashboardStats } from "@/lib/api/admin-dashboard";
import { DashboardStats } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users,
  FolderKanban,
  FileCheck2,
  FileImage,
  RefreshCw,
} from "lucide-react";
import { StatsCard } from "@/components/admin/stats-card";
import { CompletionChart } from "@/components/admin/completion-chart";
import { RecentProjects } from "@/components/admin/recent-projects";
import { ActivityLogs } from "@/components/admin/activity-logs";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async (showToast = false) => {
    if (showToast) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await getDashboardStats();

      if (response.success && response.data) {
        setStats(response.data);
        if (showToast) {
          toast.success("Dashboard refreshed successfully");
        }
      } else {
        setError(response.error || "Failed to fetch dashboard statistics");
        if (showToast) {
          toast.error("Failed to refresh dashboard", {
            description: response.error || "Please try again later",
          });
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      if (showToast) {
        toast.error("Failed to refresh dashboard", {
          description: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const refreshDashboard = () => {
    fetchStats(true);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor your annotation platform and view system activity
          </p>
        </div>
        <Button
          onClick={refreshDashboard}
          disabled={isRefreshing}
          className="w-full md:w-auto"
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Dashboard
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : stats ? (
          <>
            <StatsCard
              title="Total Users"
              value={stats.users.total}
              icon={Users}
              description="Active platform users"
              iconColor="text-blue-500"
            />
            <StatsCard
              title="Total Projects"
              value={stats.projects.total}
              icon={FolderKanban}
              description={`${stats.projects.completed} completed (${stats.projects.completionRate}%)`}
              iconColor="text-purple-500"
            />
            <StatsCard
              title="Total Images"
              value={stats.images.total}
              icon={FileImage}
              description={`${stats.images.annotated} annotated (${stats.images.annotationCompletionRate}%)`}
              iconColor="text-green-500"
            />
            <StatsCard
              title="Total Annotations"
              value={stats.annotations.total}
              icon={FileCheck2}
              description={`${stats.images.reviewed} reviewed (${stats.images.reviewCompletionRate}%)`}
              iconColor="text-amber-500"
            />
          </>
        ) : (
          <div className="col-span-4 bg-muted/40 rounded-lg p-4 text-center">
            <p className="text-muted-foreground mb-2">
              Failed to load dashboard statistics
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStats()}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Chart */}
          <CompletionChart
            data={
              stats
                ? {
                    totalImages: stats.images.total,
                    annotatedImages: stats.images.annotated,
                    reviewedImages: stats.images.reviewed,
                    approvedImages: stats.images.reviewed, // Use reviewed count since approvedImages is not available
                  }
                : {
                    totalImages: 0,
                    annotatedImages: 0,
                    reviewedImages: 0,
                    approvedImages: 0,
                  }
            }
            isLoading={isLoading}
          />

          {/* Recent Projects */}
          <RecentProjects />
        </div>

        {/* Activity Log */}
        <ActivityLogs />
      </div>
    </div>
  );
}

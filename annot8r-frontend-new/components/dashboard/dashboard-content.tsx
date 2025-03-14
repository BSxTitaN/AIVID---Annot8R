"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Clock,
  FileEdit,
  Filter,
  Grid3X3,
  Image,
  PieChart,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { getUserDashboardStats, getUserProjects } from "@/lib/api/user-projects";
import { UserDashboardStats, Project, ProjectStatus } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ProjectCard } from "@/components/dashboard/project-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardContent() {
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filter, setFilter] = useState<string>("all");

  const fetchStats = useCallback(async () => {
    try {
      const response = await getUserDashboardStats();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || "Failed to fetch dashboard stats");
        toast.error("Error loading dashboard statistics", {
          description: response.error || "Please try again later",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      toast.error("Error", { description: "Failed to load dashboard data" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getUserProjects(page, 9);

      console.log(response);
      
      if (response.success && response.data) {
        // Handle the projects data safely
        const projectsData = response.data.data || [];
        
        // Apply filter if needed
        let filteredProjects = projectsData;
        if (filter === "in-progress") {
          filteredProjects = projectsData.filter(
            project => project.status === ProjectStatus.IN_PROGRESS
          );
        } else if (filter === "completed") {
          filteredProjects = projectsData.filter(
            project => project.status === ProjectStatus.COMPLETED
          );
        }
        
        setProjects(filteredProjects);
        setTotalPages(response.data.totalPages);
      } else {
        setError(response.error || "Failed to fetch projects");
        toast.error("Error loading projects", {
          description: response.error || "Please try again later",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      toast.error("Error", { description: "Failed to load projects" });
    } finally {
      setIsLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  
  useEffect(() => {
    fetchProjects();
  }, [page, filter, fetchProjects]);

  const handleRefresh = useCallback(() => {
    fetchStats();
    fetchProjects();
  }, [fetchStats, fetchProjects]);

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value);
    setPage(1);
  }, []);

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Projects</CardTitle>
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.projectsWithPendingWork || 0} with pending work
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Images</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAssignedImages || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.completedImages || 0} completed ({stats && stats.totalAssignedImages > 0 ?
                Math.round((stats.completedImages / stats.totalAssignedImages) * 100) : 0}%)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReviewImages || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.rejectedImages || 0} rejected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvedImages || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats && stats.totalAssignedImages > 0 ?
                Math.round((stats.approvedImages / stats.totalAssignedImages) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className="bg-primary/10 rounded-full p-2 mt-0.5">
                    {activity.action.includes("SUBMIT") ? (
                      <FileEdit className="h-4 w-4 text-primary" />
                    ) : activity.action.includes("ANNOTATE") ? (
                      <PieChart className="h-4 w-4 text-primary" />
                    ) : (
                      <Clock className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {activity.action === "ANNOTATION_CREATED" && "Annotation created"}
                      {activity.action === "ANNOTATION_UPDATED" && "Annotation updated"}
                      {activity.action === "SUBMISSION_CREATED" && "Submission created"}
                      {activity.action === "SUBMISSION_REVIEWED" && "Submission reviewed"}
                      {!["ANNOTATION_CREATED", "ANNOTATION_UPDATED", "SUBMISSION_CREATED", "SUBMISSION_REVIEWED"].includes(activity.action) && activity.action.replace(/_/g, " ")}
                    </p>
                    {activity.projectName && (
                      <p className="text-xs text-muted-foreground">
                        Project: {activity.projectName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Your Projects</h2>
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter Projects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => handleFilterChange("all")}>
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    <span>All Projects</span>
                    {filter === "all" && (
                      <CheckCircle className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("in-progress")}>
                    <Clock className="h-4 w-4 mr-2" />
                    <span>In Progress</span>
                    {filter === "in-progress" && (
                      <CheckCircle className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("completed")}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Completed</span>
                    {filter === "completed" && (
                      <CheckCircle className="h-4 w-4 ml-auto text-primary" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="p-6">
                  <div className="h-5 w-3/4 bg-muted rounded"></div>
                  <div className="h-4 w-1/2 bg-muted rounded mt-2"></div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Grid3X3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              You don&apos;t have any projects assigned to you yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
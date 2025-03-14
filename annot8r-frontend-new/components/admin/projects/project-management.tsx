"use client";

import { useState, useEffect, useCallback } from "react";
import { ProjectOverviewCard } from "./project-overview-card";
import { ProjectEmptyState } from "./project-empty-state";
import { ProjectErrorState } from "./project-error-state";
import { ProjectSkeletonLoader } from "./project-skeleton-loader";
import { ProjectStatCards } from "./project-stat-cards";
import { CreateProjectDialog } from "./create-project-dialog";
import { getProjects } from "@/lib/api/projects";
import { ProjectStatus, type Project } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FolderPlus,
  Search,
  RefreshCw,
  Filter,
  Folder,
  FolderArchive,
  FolderCheck,
  FolderCog,
} from "lucide-react";

type FilterOption = "all" | "created" | "in-progress" | "completed" | "archived";

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(8); // Showing more projects per page since we're using cards
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Stats for different project states
  const createdProjects = projects.filter(p => p.status === ProjectStatus.CREATED).length;
  const inProgressProjects = projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length;
  const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
  const archivedProjects = projects.filter(p => p.status === ProjectStatus.ARCHIVED).length;

  const fetchProjects = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await getProjects(1, 100); // Fetch all projects initially, we'll handle pagination on client side

      if (response.success && response.data) {
        setProjects(response.data.data || []);
      } else {
        setError(response.error || "Failed to fetch projects");
        toast.error("Failed to load projects", {
          description: response.error || "An error occurred while fetching projects",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error("Error", { description: errorMessage });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const applyFilters = useCallback(() => {
    if (projects.length === 0) return;

    let filtered = [...projects];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    switch (filterOption) {
      case "created":
        filtered = filtered.filter((p) => p.status === ProjectStatus.CREATED);
        break;
      case "in-progress":
        filtered = filtered.filter((p) => p.status === ProjectStatus.IN_PROGRESS);
        break;
      case "completed":
        filtered = filtered.filter((p) => p.status === ProjectStatus.COMPLETED);
        break;
      case "archived":
        filtered = filtered.filter((p) => p.status === ProjectStatus.ARCHIVED);
        break;
      default:
        // "all" - no filtering needed
        break;
    }

    // Handle pagination
    const totalFilteredProjects = filtered.length;
    const totalFilteredPages = Math.ceil(totalFilteredProjects / pageSize);

    // Ensure current page is valid
    const validCurrentPage = Math.min(
      Math.max(1, currentPage),
      Math.max(1, totalFilteredPages)
    );

    if (validCurrentPage !== currentPage) {
      setCurrentPage(validCurrentPage);
      return;
    }

    // Paginate results
    const startIndex = (validCurrentPage - 1) * pageSize;
    const paginatedProjects = filtered.slice(startIndex, startIndex + pageSize);

    setFilteredProjects(paginatedProjects);
    setTotalPages(totalFilteredPages);
  }, [projects, searchQuery, filterOption, currentPage, pageSize]);

  useEffect(() => {
    applyFilters();
  }, [projects, searchQuery, filterOption, currentPage, applyFilters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleRefresh = () => {
    fetchProjects(true);
    toast.success("Refreshing projects data");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleOpenCreateDialog = () => setCreateDialogOpen(true);

  const handleProjectCreated = () => {
    setCreateDialogOpen(false);
    fetchProjects(true);
    toast.success("Project created successfully");
  };

  const renderContent = () => {
    if (isLoading && !isRefreshing) {
      return <ProjectSkeletonLoader />;
    }

    if (error) {
      return (
        <ProjectErrorState
          error={error}
          onRetry={() => fetchProjects(true)}
        />
      );
    }

    if (filteredProjects.length === 0) {
      return (
        <ProjectEmptyState
          onCreateProject={handleOpenCreateDialog}
          showCreateButton={filterOption === "all"}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredProjects.map((project) => (
          <ProjectOverviewCard key={project.id} project={project} />
        ))}
      </div>
    );
  };

  // Pagination UI
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-8">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Project stats */}
      <ProjectStatCards
        totalProjects={projects.length}
        createdProjects={createdProjects}
        inProgressProjects={inProgressProjects}
        completedProjects={completedProjects}
        archivedProjects={archivedProjects}
      />

      <Card>
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Folder className="h-5 w-5" />
                Projects
              </CardTitle>
              <CardDescription className="mt-1.5">
                {projects.length} total projects in your organization
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-[240px]"
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  size="icon"
                  className="shrink-0"
                >
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Search</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="shrink-0"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  <span className="sr-only">Refresh</span>
                </Button>
              </form>
              <Button onClick={handleOpenCreateDialog} className="shrink-0">
                <FolderPlus className="mr-2 h-4 w-4" /> New Project
              </Button>
            </div>
          </div>
        </CardHeader>

        <Tabs
          defaultValue="all"
          value={filterOption}
          onValueChange={(v) => setFilterOption(v as FilterOption)}
        >
          <div className="px-6 mb-4">
            <TabsList className="h-12 p-1 bg-muted/30">
              <TabsTrigger value="all" className="px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  <span>All</span>
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {projects.length}
                  </span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="created" className="px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <div className="flex items-center gap-2">
                  <FolderPlus className="h-4 w-4" />
                  <span>Created</span>
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {createdProjects}
                  </span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <div className="flex items-center gap-2">
                  <FolderCog className="h-4 w-4" />
                  <span>In Progress</span>
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {inProgressProjects}
                  </span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="completed" className="px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <div className="flex items-center gap-2">
                  <FolderCheck className="h-4 w-4" />
                  <span>Completed</span>
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {completedProjects}
                  </span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="archived" className="px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <div className="flex items-center gap-2">
                  <FolderArchive className="h-4 w-4" />
                  <span>Archived</span>
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {archivedProjects}
                  </span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-6 pt-4">
            {/* Content for each tab */}
            <TabsContent value="all" className="mt-2">
              {renderContent()}
            </TabsContent>
            <TabsContent value="created" className="mt-2">
              {renderContent()}
            </TabsContent>
            <TabsContent value="in-progress" className="mt-2">
              {renderContent()}
            </TabsContent>
            <TabsContent value="completed" className="mt-2">
              {renderContent()}
            </TabsContent>
            <TabsContent value="archived" className="mt-2">
              {renderContent()}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Pagination */}
      {renderPagination()}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
// components/admin/logs/activity-logs-manager.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { getActivityLogs } from "@/lib/api/activity-logs";
import { ActivityLog, ActivityAction } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  Search,
  Filter,
  RefreshCw,
  ClipboardList,
  Download,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ActivityLogsList } from "./activity-log-list";
import { ActivityLogsEmptyState } from "./activity-logs-empty-state";
import { ActivityLogsErrorState } from "./activity-logs-error-state";
import { ActivityLogsSkeletonLoader } from "./activity-logs-skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";

// Create an array of action options with display names
const actionOptions = Object.entries(ActivityAction).map(([key, value]) => ({
  value,
  label: key
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" "),
}));

export function ActivityLogsManager() {
  // State for all loaded logs and filtered logs
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [pageSize] = useState(20);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [userFilter, setUserFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  // Function to fetch all logs - only called on initial load and manual refresh
  const fetchAllLogs = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch a large batch of logs (consider pagination if needed)
      const response = await getActivityLogs(1, 500); // Fetch a larger set at once

      if (response.success && response.data) {
        setAllLogs(response.data.data || []);
        // Initialize filtered logs with all logs
        setFilteredLogs(response.data.data || []);
        setTotalLogs(response.data.total || 0);
      } else {
        setAllLogs([]);
        setFilteredLogs([]);
        const errorMsg = response.error || "Failed to fetch activity logs";
        console.error("API error:", errorMsg);
        setError(errorMsg);
        toast.error("Failed to load activity logs", {
          description: errorMsg,
        });
      }
    } catch (err) {
      setAllLogs([]);
      setFilteredLogs([]);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("Exception while fetching logs:", err);
      setError(errorMessage);
      toast.error("Error", { description: errorMessage });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchAllLogs();
  }, [fetchAllLogs]);

  // Function to apply filters to the allLogs dataset
  const applyFilters = useCallback(() => {
    if (allLogs.length === 0) return;

    let filtered = [...allLogs];

    // Apply search filter across multiple fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (log) =>
          log.user?.username?.toLowerCase().includes(query) ||
          log.user?.name?.toLowerCase().includes(query) ||
          log.action?.toLowerCase().includes(query) ||
          log.path?.toLowerCase().includes(query) ||
          log.method?.toLowerCase().includes(query) ||
          log.ip?.toLowerCase().includes(query)
      );
    }

    // Apply action filter
    if (actionFilter && actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    // Apply method filter
    if (methodFilter && methodFilter !== "all") {
      filtered = filtered.filter((log) => log.method === methodFilter);
    }

    // Apply date range filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((log) => new Date(log.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.timestamp) <= end);
    }

    // Apply user filter
    if (userFilter) {
      filtered = filtered.filter((log) => log.user?.id === userFilter);
    }

    // Apply project filter
    if (projectFilter) {
      filtered = filtered.filter((log) => log.projectId === projectFilter);
    }

    // Calculate pagination
    const totalFilteredLogs = filtered.length;
    const totalFilteredPages = Math.ceil(totalFilteredLogs / pageSize);

    // Enforce valid page number
    const validCurrentPage = Math.min(
      Math.max(1, currentPage),
      Math.max(1, totalFilteredPages)
    );

    if (validCurrentPage !== currentPage) {
      setCurrentPage(validCurrentPage);
      return; // Exit as the useEffect will trigger again with the corrected page
    }

    // Apply pagination
    const startIndex = (validCurrentPage - 1) * pageSize;
    const paginatedLogs = filtered.slice(startIndex, startIndex + pageSize);

    // Update state
    setFilteredLogs(paginatedLogs);
    setTotalPages(totalFilteredPages);
    setTotalLogs(totalFilteredLogs);
  }, [
    allLogs,
    searchQuery,
    actionFilter,
    methodFilter,
    startDate,
    endDate,
    userFilter,
    projectFilter,
    currentPage,
    pageSize,
  ]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [
    searchQuery,
    actionFilter,
    methodFilter,
    startDate,
    endDate,
    userFilter,
    projectFilter,
    currentPage,
    applyFilters,
  ]);

  // Handle search and filter
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when applying new filters
    // applyFilters() will be called by the useEffect
  };

  // Handle manual refresh - this will make an API call
  const handleRefresh = () => {
    fetchAllLogs(true);
    toast.success("Refreshing activity logs");
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // applyFilters() will be called by the useEffect
  };

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setActionFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setUserFilter("");
    setProjectFilter("");
    setMethodFilter("all");
    setCurrentPage(1);
    toast.success("Filters reset");
  }, []);

  // Export logs functionality (client-side)
  const handleExport = () => {
    toast.info("Preparing export...");

    try {
      // Apply all current filters but don't paginate
      let dataToExport = [...allLogs];

      // Apply the same filtering logic as applyFilters but without pagination
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        dataToExport = dataToExport.filter(
          (log) =>
            log.user?.username?.toLowerCase().includes(query) ||
            log.user?.name?.toLowerCase().includes(query) ||
            log.action?.toLowerCase().includes(query) ||
            log.path?.toLowerCase().includes(query) ||
            log.method?.toLowerCase().includes(query) ||
            log.ip?.toLowerCase().includes(query)
        );
      }

      if (actionFilter && actionFilter !== "all") {
        dataToExport = dataToExport.filter(
          (log) => log.action === actionFilter
        );
      }

      if (methodFilter && methodFilter !== "all") {
        dataToExport = dataToExport.filter(
          (log) => log.method === methodFilter
        );
      }

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dataToExport = dataToExport.filter(
          (log) => new Date(log.timestamp) >= start
        );
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dataToExport = dataToExport.filter(
          (log) => new Date(log.timestamp) <= end
        );
      }

      if (userFilter) {
        dataToExport = dataToExport.filter(
          (log) => log.user?.id === userFilter
        );
      }

      if (projectFilter) {
        dataToExport = dataToExport.filter(
          (log) => log.projectId === projectFilter
        );
      }

      // Format data as CSV
      const headers = [
        "Timestamp",
        "Action",
        "User",
        "Method",
        "Path",
        "IP",
        "Details",
      ];

      const csvData = dataToExport.map((log) => [
        new Date(log.timestamp).toISOString(),
        log.action,
        `${log.user?.name} (${log.user?.username})`,
        log.method,
        log.path,
        log.ip,
        JSON.stringify(log.details),
      ]);

      // Add headers
      csvData.unshift(headers);

      // Convert to CSV string
      const csvContent = csvData
        .map((row) =>
          row
            .map((cell) =>
              typeof cell === "string" && cell.includes(",")
                ? `"${cell.replace(/"/g, '""')}"`
                : cell
            )
            .join(",")
        )
        .join("\n");

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `activity_logs_export_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Activity logs exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export logs", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }
  };

  // Determine what to render based on state
  const renderContent = () => {
    if (isLoading && !isRefreshing) {
      return <ActivityLogsSkeletonLoader />;
    }

    if (error) {
      return (
        <ActivityLogsErrorState
          error={error}
          onRetry={() => fetchAllLogs(true)}
        />
      );
    }

    if (filteredLogs.length === 0) {
      return <ActivityLogsEmptyState onReset={resetFilters} />;
    }

    return (
      <ActivityLogsList
        logs={filteredLogs}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        isRefreshing={isRefreshing}
      />
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  System Activity Logs
                </CardTitle>
                <CardDescription className="mt-1.5">
                  {totalLogs} activities recorded in the system
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {/* Filters */}
            <div className="mb-6 space-y-4">
              <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {actionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date range picker */}
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[130px] justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PP") : "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[130px] justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PP") : "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button type="submit" variant="secondary" size="icon">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Filter</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                >
                  Reset
                </Button>
              </form>
            </div>

            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

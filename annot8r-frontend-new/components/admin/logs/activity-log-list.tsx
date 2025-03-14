// components/admin/logs/activity-log-list.tsx
import { useState } from "react";
import { ActivityLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// Utility function to format action names
function formatActionName(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

// Utility function to get the badge variant based on action type
function getActionBadgeVariant(
  action: string
): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("CREATED")) return "default";
  if (action.includes("UPDATED")) return "secondary";
  if (action.includes("DELETED")) return "destructive";
  return "outline";
}

// Utility function to get method badge variant
function getMethodBadgeVariant(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-blue-500";
    case "POST":
      return "bg-green-500";
    case "PUT":
      return "bg-yellow-500";
    case "PATCH":
      return "bg-orange-500";
    case "DELETE":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function getActionLabel(action: string): string {
  // Format action names for display
  switch (action) {
    case "DASHBOARD_VIEWED":
      return "Dashboard Viewed";
    case "STATS_VIEWED":
      return "Statistics Viewed";
    case "LOGS_VIEWED":
      return "Activity Logs Viewed";
    case "LOGS_EXPORTED":
      return "Activity Logs Exported";
    case "SYSTEM_STATUS_CHECKED":
      return "System Status Checked";
    case "ADMINS_VIEWED":
      return "Admins List Viewed";
    case "ADMIN_VIEWED":
      return "Admin Details Viewed";
    default:
      // Fall back to the existing formatting function
      return formatActionName(action);
  }
}

interface ActivityLogsListProps {
  logs: ActivityLog[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isRefreshing?: boolean;
}

export function ActivityLogsList({
  logs,
  currentPage,
  totalPages,
  onPageChange,
  isRefreshing = false,
}: ActivityLogsListProps) {
  // Defensive programming to ensure logs is always an array
  const safetyLogs = logs || [];
  
  // State to track the selected log for details and sheet open state
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Function to open the details sheet
  const handleOpenDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };

  return (
    <div className={`space-y-4 ${isRefreshing ? "opacity-70" : ""}`}>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[180px]">Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="w-[100px]">Method</TableHead>
              <TableHead>Path</TableHead>
              <TableHead className="w-[100px] text-center">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safetyLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  No activity logs matching the current filters
                </TableCell>
              </TableRow>
            ) : (
              safetyLogs.map((log) => (
                <TableRow
                  key={log?.id || Math.random()}
                  className="group hover:bg-muted/30"
                >
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm">
                            {log?.timestamp
                              ? formatDistanceToNow(new Date(log.timestamp), {
                                  addSuffix: true,
                                })
                              : "Unknown date"}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {log?.timestamp
                            ? format(new Date(log.timestamp), "PPpp")
                            : "Unknown date"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log?.action || "")}>
                      {getActionLabel(log?.action || "UNKNOWN")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {log?.user?.name || "Unknown user"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @{log?.user?.username || "unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${getMethodBadgeVariant(
                        log?.method || ""
                      )} text-white`}
                    >
                      {log?.method || "UNKNOWN"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log?.apiPath
                      ? log.apiPath.length > 30
                        ? log.apiPath.substring(0, 30) + "..."
                        : log.apiPath
                      : "Unknown path"}
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDetails(log)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <div className="text-sm font-medium">{currentPage}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}

      {/* Details Drawer */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-md md:max-w-lg">
          <SheetHeader>
            <SheetTitle>Activity Log Details</SheetTitle>
            <SheetDescription>
              {selectedLog?.timestamp && (
                <span className="text-sm font-medium">
                  {format(new Date(selectedLog.timestamp), "PPpp")}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {selectedLog && (
              <>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Action</h3>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getActionBadgeVariant(selectedLog.action || "")}>
                      {getActionLabel(selectedLog.action || "UNKNOWN")}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">User</h3>
                  <div>
                    <p className="font-medium">{selectedLog.user?.name || "Unknown user"}</p>
                    <p className="text-sm text-muted-foreground">
                      @{selectedLog.user?.username || "unknown"}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Request</h3>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={`${getMethodBadgeVariant(
                          selectedLog.method || ""
                        )} text-white`}
                      >
                        {selectedLog.method || "UNKNOWN"}
                      </Badge>
                      <span className="font-mono text-xs">
                        {selectedLog.apiPath || "Unknown path"}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold">IP:</span>{" "}
                      {selectedLog.ip || "Unknown"}
                    </p>
                  </div>
                </div>
                
                {selectedLog.projectId && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Project</h3>
                    <p>{selectedLog.projectId}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">User Agent</h3>
                  <p className="text-xs break-words">
                    {selectedLog.userAgent || "Unknown"}
                  </p>
                </div>
                
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Additional Details</h3>
                    <div className="bg-muted p-3 rounded-md text-xs">
                      {Object.entries(selectedLog.details).map(([key, value]) => (
                        <div key={key} className="py-1">
                          <span className="font-semibold">{key}:</span>{" "}
                          <span className="break-words">
                            {typeof value === "object"
                              ? JSON.stringify(value, null, 2)
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { SecurityLogType, SecurityLog } from "@/lib/types/logs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Info,
} from "lucide-react";
import { LastUpdated } from "./LastUpdated";
import {
  getSecurityLogs,
  LogsResponse,
  SecurityLogFilters,
} from "@/lib/apis/logs";

type SortField = "userId" | "logType" | "timestamp" | "ip";
type SortOrder = "asc" | "desc";

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

interface LogTypeGroup {
  label: string;
  types: SecurityLogType[];
}

const LOG_TYPE_GROUPS: LogTypeGroup[] = [
  {
    label: "Authentication Events",
    types: [
      SecurityLogType.LOGIN_SUCCESS,
      SecurityLogType.LOGIN_FAILED,
      SecurityLogType.LOGIN_ATTEMPT_LOCKED,
      SecurityLogType.ADMIN_LOGIN,
      SecurityLogType.USER_LOGOUT,
    ],
  },
  {
    label: "Account Events",
    types: [
      SecurityLogType.ACCOUNT_LOCKED,
      SecurityLogType.ACCOUNT_UNLOCKED,
      SecurityLogType.PASSWORD_RESET,
      SecurityLogType.ADMIN_PASSWORD_RESET,
      SecurityLogType.ADMIN_REVOKED,
      SecurityLogType.USER_DELETED,
      SecurityLogType.ADMIN_DELETED,
      SecurityLogType.PROJECT_SUBMITTED,
      SecurityLogType.PROJECT_UNMARKED,
      SecurityLogType.USER_UPDATED,
    ],
  },
  {
    label: "Project Events",
    types: [
      SecurityLogType.PROJECT_SUBMITTED,
      SecurityLogType.PROJECT_UNMARKED,
    ],
  },
  {
    label: "Security Events",
    types: [
      SecurityLogType.DEVICE_CHANGE,
      SecurityLogType.DEVICE_MISMATCH,
      SecurityLogType.SUSPICIOUS_ACTIVITY,
      SecurityLogType.RATE_LIMIT_EXCEEDED,
    ],
  },
  {
    label: "Client Security",
    types: [
      SecurityLogType.INSPECT_ELEMENT,
      SecurityLogType.SCREENSHOT_ATTEMPT,
      SecurityLogType.SCREEN_RECORD_ATTEMPT,
      SecurityLogType.KEYBOARD_SHORTCUT,
    ],
  },
  {
    label: "System Events",
    types: [
      SecurityLogType.USER_CREATED,
      SecurityLogType.ADMIN_CREATED,
      SecurityLogType.UNAUTHORIZED_ACCESS,
    ],
  },
];

const generatePaginationRange = (currentPage: number, totalPages: number) => {
  const delta = 2; // Number of pages to show on each side of current page
  const range: (number | string)[] = [];

  // Start range
  for (let i = 1; i <= Math.min(3, totalPages); i++) {
    range.push(i);
  }
  if (currentPage - delta > 4) {
    range.push("...");
  }

  // Middle range
  for (
    let i = Math.max(4, currentPage - delta);
    i <= Math.min(totalPages - 3, currentPage + delta);
    i++
  ) {
    range.push(i);
  }

  // End range
  if (currentPage + delta < totalPages - 3) {
    range.push("...");
  }
  for (
    let i = Math.max(totalPages - 2, Math.min(totalPages, 4));
    i <= totalPages;
    i++
  ) {
    range.push(i);
  }

  return [...new Set(range)]; // Remove duplicates
};

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLogType, setSelectedLogType] = useState<string>("all");
  const [sort, setSort] = useState<SortConfig>({
    field: "timestamp",
    order: "desc",
  });
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);

  const fetchLogs = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const filters: SecurityLogFilters = {
          page: currentPage,
          limit: 10,
        };

        if (searchQuery) {
          filters.userId = searchQuery;
        }

        if (selectedLogType !== "all") {
          filters.logType = selectedLogType as SecurityLogType;
        }

        // Use the getSecurityLogs API function instead of direct fetchWithAuth
        const response: LogsResponse = await getSecurityLogs(filters);

        setLogs(response.logs);
        setTotalPages(response.pagination.totalPages);
        setLastRefreshed(new Date());
      } catch (error) {
        toast.error("Failed to fetch security logs");
        console.error("Error fetching logs:", error);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [currentPage, searchQuery, selectedLogType]
  );

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const getSeverityColor = useCallback((logType: SecurityLogType): string => {
    // High severity - Red
    if (
      [
        SecurityLogType.SUSPICIOUS_ACTIVITY,
        SecurityLogType.LOGIN_ATTEMPT_LOCKED,
        SecurityLogType.ACCOUNT_LOCKED,
        SecurityLogType.ADMIN_REVOKED,
        SecurityLogType.UNAUTHORIZED_ACCESS,
        SecurityLogType.USER_DELETED,
        SecurityLogType.ADMIN_DELETED,
      ].includes(logType)
    ) {
      return "bg-red-50 text-red-700";
    }

    // Warning - Yellow
    if (
      [
        SecurityLogType.LOGIN_FAILED,
        SecurityLogType.DEVICE_MISMATCH,
        SecurityLogType.RATE_LIMIT_EXCEEDED,
        SecurityLogType.INSPECT_ELEMENT,
        SecurityLogType.SCREENSHOT_ATTEMPT,
        SecurityLogType.SCREEN_RECORD_ATTEMPT,
        SecurityLogType.PROJECT_UNMARKED, // Added here as it's a warning state
      ].includes(logType)
    ) {
      return "bg-yellow-50 text-yellow-700";
    }

    // Info - Blue
    if (
      [
        SecurityLogType.DEVICE_CHANGE,
        SecurityLogType.PASSWORD_RESET,
        SecurityLogType.ADMIN_PASSWORD_RESET,
        SecurityLogType.USER_CREATED,
        SecurityLogType.ADMIN_CREATED,
        SecurityLogType.PROJECT_SUBMITTED, // Added here as it's an info state
        SecurityLogType.USER_UPDATED,
      ].includes(logType)
    ) {
      return "bg-blue-50 text-blue-700";
    }

    // Success - Green
    return "bg-green-50 text-green-700";
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleLogTypeChange = useCallback((value: string) => {
    setSelectedLogType(value);
    setCurrentPage(1);
  }, []);

  const handleManualRefresh = useCallback(() => {
    void fetchLogs(true);
    toast.success("Logs refreshed");
  }, [fetchLogs]);

  const SortIndicator = useCallback(
    ({ field }: { field: SortField }) => (
      <ArrowUpDown
        className={`ml-1 h-4 w-4 inline-block transition-colors ${
          sort.field === field ? "text-primary" : "text-gray-400"
        }`}
      />
    ),
    [sort.field]
  );

  // For log details
  const formatLogDetails = useMemo(() => {
    if (!selectedLog) return [];

    const details: { label: string; value: string }[] = [
      { label: "User ID", value: selectedLog.userId },
      { label: "Event Type", value: selectedLog.logType.replace(/_/g, " ") },
      {
        label: "Timestamp",
        value: new Date(selectedLog.timestamp).toLocaleString(),
      },
      { label: "IP Address", value: selectedLog.details.ip },
      { label: "User Agent", value: selectedLog.details.userAgent },
    ];

    if (selectedLog.details.path) {
      details.push({ label: "Path", value: selectedLog.details.path });
    }

    if (selectedLog.details.keyPressed) {
      details.push({
        label: "Key Pressed",
        value: selectedLog.details.keyPressed,
      });
    }

    if (selectedLog.details.requestCount) {
      details.push({
        label: "Request Count",
        value: selectedLog.details.requestCount.toString(),
      });
    }

    if (selectedLog.details.deviceInfo) {
      details.push({
        label: "Device Info",
        value: selectedLog.details.deviceInfo,
      });
    }

    // Add special handling for project-related logs
    if (
      selectedLog.logType === SecurityLogType.PROJECT_SUBMITTED ||
      selectedLog.logType === SecurityLogType.PROJECT_UNMARKED
    ) {
      if (selectedLog.details.additionalInfo) {
        details.push({
          label: "Project Details",
          value: selectedLog.details.additionalInfo,
        });
      }
    }

    // Handle user update logs
    if (selectedLog.logType === SecurityLogType.USER_UPDATED) {
      if (selectedLog.details.additionalInfo) {
        details.push({
          label: "Update Details",
          value: selectedLog.details.additionalInfo,
        });
      }
    }

    return details;
  }, [selectedLog]);

  const getEventDescription = useCallback(
    (logType: SecurityLogType, details: SecurityLog["details"]): string => {
      switch (logType) {
        case SecurityLogType.PROJECT_SUBMITTED:
          return `Project submitted for review - ${
            details.additionalInfo || ""
          }`;
        case SecurityLogType.PROJECT_UNMARKED:
          return `Project marked as incomplete - ${
            details.additionalInfo || ""
          }`;
        case SecurityLogType.USER_DELETED:
          return `User account deleted`;
        case SecurityLogType.ADMIN_DELETED:
          return `Admin account deleted - ${details.additionalInfo || ""}`;
        case SecurityLogType.USER_UPDATED:
          return `User settings updated - ${details.additionalInfo || ""}`;
        default:
          return details.additionalInfo || "";
      }
    },
    []
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Security Logs</CardTitle>
          <LastUpdated
            timestamp={lastRefreshed}
            onRefresh={() => handleManualRefresh()}
          />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Input
              placeholder="Search by user ID..."
              className="max-w-xs"
              value={searchQuery}
              onChange={handleSearch}
            />
            <Select value={selectedLogType} onValueChange={handleLogTypeChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {LOG_TYPE_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel className="font-semibold">
                      {group.label}
                    </SelectLabel>
                    {group.types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("userId")}
                  >
                    User ID <SortIndicator field="userId" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("logType")}
                  >
                    Event Type <SortIndicator field="logType" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("ip")}
                  >
                    IP Address <SortIndicator field="ip" />
                  </TableHead>
                  <TableHead>User Agent</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("timestamp")}
                  >
                    Timestamp <SortIndicator field="timestamp" />
                  </TableHead>
                  <TableHead className="w-[50px]">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log._id} className="group">
                      <TableCell className="font-medium">
                        {log.userId}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getSeverityColor(
                            log.logType
                          )}`}
                        >
                          {log.logType.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>{log.details.ip}</TableCell>
                      <TableCell
                        className="max-w-xs truncate"
                        title={log.details.userAgent}
                      >
                        {log.details.userAgent}
                      </TableCell>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getEventDescription(log.logType, log.details)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setSelectedLog(log)}
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

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>

              <div className="flex items-center gap-1">
                {generatePaginationRange(currentPage, totalPages).map(
                  (page, idx) => {
                    if (page === "...") {
                      return (
                        <div key={`ellipsis-${idx}`} className="px-2">
                          ...
                        </div>
                      );
                    }

                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page as number)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  }
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Log Details</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] mt-8">
            <div className="space-y-6">
              {formatLogDetails.map((detail, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {detail.label}
                  </p>
                  <p className="text-sm break-all">{detail.value}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

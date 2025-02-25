// app/(admin)/components/users/UserSecurityLogs.tsx
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { getUserLogs } from "@/lib/apis/users";
import type { UserInfo } from "@/lib/types/users";
import type { SecurityLog } from "@/lib/types/logs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SecurityLogType } from "@/lib/types/logs";
import { toast } from "sonner";

interface UserSecurityLogsProps {
  user: UserInfo;
}

export function UserSecurityLogs({ user }: UserSecurityLogsProps) {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<SecurityLogType | "all">(
    "all"
  );

  const handleTypeChange = (value: string) => {
    setSelectedType(value as SecurityLogType | "all");
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getUserLogs(
        user.username,
        1,
        50,
        selectedType === "all" ? undefined : selectedType
      );
      setLogs(response.logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to fetch security logs");
    } finally {
      setLoading(false);
    }
  }, [user.username, selectedType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getLogColor = (logType: SecurityLogType): string => {
    switch (logType) {
      case SecurityLogType.ACCOUNT_LOCKED:
      case SecurityLogType.LOGIN_FAILED:
      case SecurityLogType.LOGIN_ATTEMPT_LOCKED:
      case SecurityLogType.SUSPICIOUS_ACTIVITY:
        return "text-red-600";
      case SecurityLogType.LOGIN_SUCCESS:
      case SecurityLogType.ACCOUNT_UNLOCKED:
        return "text-green-600";
      case SecurityLogType.DEVICE_CHANGE:
      case SecurityLogType.DEVICE_MISMATCH:
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="ios-loader" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Filter by Type</Label>
        <Select value={selectedType} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select log type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {Object.values(SecurityLogType).map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log._id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`font-medium ${getLogColor(log.logType)}`}>
                  {log.logType.replace(/_/g, " ")}
                </span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(log.timestamp), "PPpp")}
                </span>
              </div>

              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">IP Address:</span>{" "}
                  {log.details.ip}
                </p>
                <p>
                  <span className="text-muted-foreground">User Agent:</span>{" "}
                  {log.details.userAgent}
                </p>
                {log.details.path && (
                  <p>
                    <span className="text-muted-foreground">Path:</span>{" "}
                    {log.details.path}
                  </p>
                )}
                {log.details.additionalInfo && (
                  <p>
                    <span className="text-muted-foreground">
                      Additional Info:
                    </span>{" "}
                    {log.details.additionalInfo}
                  </p>
                )}
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No logs found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

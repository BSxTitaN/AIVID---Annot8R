// app/(admin)/components/admins/AdminSecurityLogs.tsx
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { getAdminLogs } from "@/lib/apis/admins";
import type { AdminInfo } from "@/lib/types/admins";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AdminSecurityLogsProps {
  admin: AdminInfo;
}

interface LogEntry {
  _id: string;
  timestamp: Date;
  logType: string;
  details: {
    userAgent: string;
    ip: string;
    path?: string;
    additionalInfo?: string;
  };
}

export function AdminSecurityLogs({ admin }: AdminSecurityLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminLogs(admin.username);
      setLogs(response.logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to fetch security logs");
    } finally {
      setLoading(false);
    }
  }, [admin.username]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="ios-loader" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log._id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{log.logType.replace(/_/g, " ")}</Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(log.timestamp), "PPpp")}
              </span>
            </div>

            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">IP Address:</span>{" "}
                {log.details.ip}
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
  );
}

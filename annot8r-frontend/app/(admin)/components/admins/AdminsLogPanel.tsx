// components/admins/AdminLogsPanel.tsx
import { useCallback, useEffect, useState } from "react";
import { SidePanel } from "../SidePanel";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/apis/config";

interface AdminLogsProps {
  username: string | null;
  onClose: () => void;
}

interface LogEntry {
  timestamp: Date;
  logType: string;
  details: {
    ip: string;
    userAgent: string;
    path?: string;
    additionalInfo?: string;
  };
}

export function AdminLogsPanel({ username, onClose }: AdminLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!username) return;
    
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/security-logs/admin/${username}`);
      setLogs(response.logs);
    } catch {
      toast.error('Failed to fetch admin logs');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) {
      void fetchLogs();
    }
  }, [username, fetchLogs]);

  return (
    <SidePanel
      open={!!username}
      onClose={onClose}
      title={`Admin Logs - ${username}`}
      onRefresh={fetchLogs}
    >
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No logs found
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{log.logType}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <p>IP: {log.details.ip}</p>
                  {log.details.path && <p>Path: {log.details.path}</p>}
                  {log.details.additionalInfo && (
                    <p>Details: {log.details.additionalInfo}</p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">
                    {log.details.userAgent}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </SidePanel>
  );
}
import { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/apis/config";
import { Card } from "@/components/ui/card";
import { SidePanel } from "../SidePanel";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SecurityLog } from "@/lib/types/logs";

interface LogsPanelProps {
  open: boolean;
  onClose: () => void;
  username?: string;
}

export function LogsPanel({ open, onClose, username }: LogsPanelProps) {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!username) return;
    
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/auth/users/${username}/logs`);
      setLogs(response.logs);
    } catch {
      toast.error("Failed to fetch user logs");
    } finally {
      setLoading(false);
    }
  }, [username]); // username is the only dependency

  useEffect(() => {
    if (open && username) {
      void fetchLogs();
    }
  }, [open, username, fetchLogs]);
  

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={`Security Logs - ${username}`}
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
          {logs.map((log) => (
            <Card key={log._id} className="p-4">
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
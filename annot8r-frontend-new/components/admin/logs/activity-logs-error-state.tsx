// components/admin/logs/activity-logs-error-state.tsx
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ActivityLogsErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function ActivityLogsErrorState({
  error,
  onRetry,
}: ActivityLogsErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        Failed to load activity logs
      </h3>
      <p className="text-muted-foreground max-w-sm mb-2">
        We encountered an error while loading the activity log data.
      </p>
      <p className="text-destructive text-sm mb-6 max-w-md">{error}</p>
      <Button onClick={onRetry} variant="secondary">
        <RefreshCw className="mr-2 h-4 w-4" /> Retry
      </Button>
    </div>
  );
}

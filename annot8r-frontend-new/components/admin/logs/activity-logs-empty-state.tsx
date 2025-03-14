// components/admin/logs/activity-logs-empty-state.tsx
import { Button } from "@/components/ui/button";
import { ClipboardX, RefreshCw } from "lucide-react";

interface ActivityLogsEmptyStateProps {
  onReset: () => void;
}

export function ActivityLogsEmptyState({
  onReset,
}: ActivityLogsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <ClipboardX className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No activity logs found</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        There are no activity logs that match your current filters. Try
        adjusting your search criteria.
      </p>
      <Button onClick={onReset} variant="secondary">
        <RefreshCw className="mr-2 h-4 w-4" />
        Reset Filters
      </Button>
    </div>
  );
}

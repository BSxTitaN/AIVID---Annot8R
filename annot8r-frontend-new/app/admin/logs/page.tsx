// app/(admin)/admin/logs/page.tsx
import { Metadata } from "next";
import { ActivityLogsManager } from "@/components/admin/logs/activity-logs-manager";

export const metadata: Metadata = {
  title: "Activity Logs - Annot8R Admin",
  description: "View and analyze system activity logs",
};

export default function ActivityLogsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page header with contextual information */}
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground">
          Monitor and analyze all system activities across the platform.
        </p>
      </div>

      {/* Main content area */}
      <ActivityLogsManager />
    </div>
  );
}

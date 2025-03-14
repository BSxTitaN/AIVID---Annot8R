// components/admin/projects/project-detail/project-exports-panel.tsx
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, AlertCircle, RefreshCw, CheckCircle, Clock } from "lucide-react";
import { ProjectExport, ExportStatus } from "@/lib/types";
import { getExports, getExportDownload } from "@/lib/api/projects";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ProjectExportsPanelProps {
  projectId: string;
}

export function ProjectExportsPanel({ projectId }: ProjectExportsPanelProps) {
  const [exports, setExports] = useState<ProjectExport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const fetchExports = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getExports(projectId, 1, 5);
      if (response.success && response.data) {
        setExports(response.data.data);
      } else {
        console.error("Failed to fetch exports:", response.error);
      }
    } catch (error) {
      console.error("Error fetching exports:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchExports();
  }, [fetchExports, projectId]);

  const handleDownload = async (exportId: string) => {
    setIsDownloading(exportId);
    try {
      const response = await getExportDownload(projectId, exportId);
      if (response.success && response.data && response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error("Failed to get download URL", {
          description: response.error || "Please try again later",
        });
      }
    } catch (error) {
      console.error("Error downloading export:", error);
      toast.error("Download failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const getStatusBadge = (status: ExportStatus) => {
    switch (status) {
      case ExportStatus.PENDING:
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <Clock className="h-3 w-3 mr-1" />Pending
        </Badge>;
      case ExportStatus.PROCESSING:
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processing
        </Badge>;
      case ExportStatus.COMPLETED:
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />Completed
        </Badge>;
      case ExportStatus.FAILED:
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
          <AlertCircle className="h-3 w-3 mr-1" />Failed
        </Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Recent Exports</CardTitle>
          <CardDescription>
            Download previously exported project data
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchExports} disabled={isLoading}>
          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted/40 rounded-md">
                <Skeleton className="h-5 w-24" />
                <div className="flex space-x-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : exports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No exports created yet
          </div>
        ) : (
          <div className="space-y-3">
            {exports.map((exportItem) => (
              <div key={exportItem.id} className="flex items-center justify-between p-2 bg-muted/40 rounded-md">
                <div className="space-y-1">
                  <div className="font-medium text-sm">
                    {format(new Date(exportItem.exportedAt), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>
                      {exportItem.includesImages ? "With images" : "Annotations only"}
                    </span>
                    <span>•</span>
                    <span>
                      {exportItem.totalImages} image{exportItem.totalImages !== 1 ? 's' : ''}
                    </span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(exportItem.exportedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(exportItem.status)}
                  {exportItem.status === ExportStatus.COMPLETED && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(exportItem.id)}
                      disabled={isDownloading === exportItem.id}
                    >
                      {isDownloading === exportItem.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
// components/admin/dashboard/activity-logs.tsx
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ActivityAction, ActivityLog } from "@/lib/types";
import { getActivityLogs } from "@/lib/api/admin-dashboard";
import { 
  User, 
  FileEdit, 
  Image, 
  Users, 
  Upload, 
  ClipboardCheck, 
  LogIn, 
  LogOut,
  Activity
} from "lucide-react";

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getActivityLogs(page, 10);
        if (response.success && response.data) {
          setLogs(response.data.data);
          setTotalPages(response.data.totalPages);
        } else {
          setError(response.error || "Failed to fetch activity logs");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [page]);

  const getActivityIcon = (action: string) => {
    switch (action) {
      case ActivityAction.USER_CREATED:
      case ActivityAction.USER_UPDATED:
      case ActivityAction.USER_DELETED:
        return <User className="h-4 w-4 text-blue-500" />;
      
      case ActivityAction.PROJECT_CREATED:
      case ActivityAction.PROJECT_UPDATED:
      case ActivityAction.PROJECT_DELETED:
        return <FileEdit className="h-4 w-4 text-purple-500" />;
        
      case ActivityAction.IMAGES_UPLOADED:
      case ActivityAction.IMAGE_DELETED:
        return <Image className="h-4 w-4 text-green-500" />;
        
      case ActivityAction.MEMBER_ADDED:
      case ActivityAction.MEMBER_REMOVED:
        return <Users className="h-4 w-4 text-yellow-500" />;
        
      case ActivityAction.IMAGES_ASSIGNED:
      case ActivityAction.IMAGES_REASSIGNED:
        return <Upload className="h-4 w-4 text-indigo-500" />;
        
      case ActivityAction.ANNOTATION_CREATED:
      case ActivityAction.ANNOTATION_UPDATED:
      case ActivityAction.AUTO_ANNOTATION_APPLIED:
        return <ClipboardCheck className="h-4 w-4 text-teal-500" />;
        
      case ActivityAction.SUBMISSION_CREATED:
      case ActivityAction.SUBMISSION_REVIEWED:
        return <ClipboardCheck className="h-4 w-4 text-orange-500" />;
        
      case ActivityAction.USER_LOGIN:
        return <LogIn className="h-4 w-4 text-blue-500" />;
        
      case ActivityAction.USER_LOGOUT:
        return <LogOut className="h-4 w-4 text-gray-500" />;

      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityLabel = (action: string) => {
    // Convert from enum-like format to readable text
    return action
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "GET":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">GET</Badge>;
      case "POST":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">POST</Badge>;
      case "PUT":
      case "PATCH":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">{method}</Badge>;
      case "DELETE":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">DELETE</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>Activity Logs</CardTitle>
        <CardDescription>Recent system activities</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>Failed to load activity logs</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No activity logs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 pb-4 border-b last:border-0">
                <div className="p-2 bg-muted rounded-full">
                  {getActivityIcon(log.action)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <p className="font-medium text-sm">
                      {getActivityLabel(log.action)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    By {log.user.name || log.user.username}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <span className="mr-2">{log.path}</span>
                    {getMethodBadge(log.method)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {!isLoading && logs.length > 0 && (
        <CardFooter className="flex justify-between pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <div className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
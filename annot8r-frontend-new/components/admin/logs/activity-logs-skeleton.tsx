// components/admin/logs/activity-logs-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ActivityLogsSkeletonLoader() {
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Path</TableHead>
            <TableHead className="w-[80px]">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-6 w-28" /></TableCell>
              <TableCell><Skeleton className="h-5 w-36" /></TableCell>
              <TableCell><Skeleton className="h-6 w-16" /></TableCell>
              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              <TableCell className="text-center"><Skeleton className="h-8 w-8 rounded-full mx-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Skeleton pagination */}
      <div className="flex items-center justify-between py-4 mt-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
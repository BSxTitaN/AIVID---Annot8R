// app/(admin)/components/admins/AdminDataTable.tsx
import { formatDistanceToNow } from "date-fns";
import { Key, LayoutList, MoreVertical, Shield, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { AdminInfo } from "@/lib/types/admins";

interface AdminDataTableProps {
  admins: AdminInfo[];
  loading: boolean;
  onViewLogs: (admin: AdminInfo) => void;
  onResetPassword: (admin: AdminInfo) => void;
  onDeleteAdmin: (admin: AdminInfo) => void;
}

export function AdminDataTable({
  admins,
  loading,
  onViewLogs,
  onResetPassword,
  onDeleteAdmin,
}: AdminDataTableProps) {
  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="ios-loader" />
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-52">Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center">
                No admins found
              </TableCell>
            </TableRow>
          ) : (
            admins.map((admin) => (
              <TableRow key={admin.username}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {admin.username}
                    {admin.isSuperAdmin && (
                      <Shield className="h-4 w-4 text-purple-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={admin.isSuperAdmin ? "default" : "secondary"}>
                    {admin.isSuperAdmin ? "Super Admin" : "Admin"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {admin.isLocked ? (
                    <Badge variant="destructive">Locked</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {admin.lastLogin
                    ? formatDistanceToNow(new Date(admin.lastLogin), {
                        addSuffix: true,
                      })
                    : "Never"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => onViewLogs(admin)}>
                        <LayoutList className="h-4 w-4 mr-2" />
                        View Logs
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => onResetPassword(admin)}>
                        <Key className="h-4 w-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>

                      {!admin.isSuperAdmin && (
                        <>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => onDeleteAdmin(admin)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Admin
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

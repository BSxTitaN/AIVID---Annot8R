// app/(admin)/components/users/DataTable.tsx
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpDown,
  Key,
  LayoutList,
  LogOut,
  MoreVertical,
  ShieldAlert,
  Trash2,
  Building2,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { UserInfo, SortConfig } from "@/lib/types/users";

interface DataTableProps {
  users: UserInfo[];
  loading: boolean;
  sort: SortConfig;
  onSort: (sort: SortConfig) => void;
  onViewLogs: (user: UserInfo) => void;
  onViewProjects: (user: UserInfo) => void;
  onLockUser: (user: UserInfo) => void;
  onResetPassword: (user: UserInfo) => void;
  onDeleteUser: (user: UserInfo) => void;
  onForceLogout: (user: UserInfo) => void;
  onUpdateOfficeStatus: (user: UserInfo, isOfficeUser: boolean) => void;
}

export function DataTable({
  users,
  loading,
  sort,
  onSort,
  onViewLogs,
  onViewProjects,
  onLockUser,
  onResetPassword,
  onDeleteUser,
  onForceLogout,
  onUpdateOfficeStatus,
}: DataTableProps) {
  const handleSort = (field: SortConfig["field"]) => {
    onSort({
      field,
      order: sort.field === field && sort.order === "asc" ? "desc" : "asc",
    });
  };

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
            <TableHead
              className="w-52 cursor-pointer"
              onClick={() => handleSort("username")}
            >
              Username{" "}
              <ArrowUpDown className="ml-2 h-4 w-4 inline-block opacity-50" />
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Office Status</TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("createdAt")}
            >
              Last Activity{" "}
              <ArrowUpDown className="ml-2 h-4 w-4 inline-block opacity-50" />
            </TableHead>
            <TableHead>Device Info</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user._id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  {user.isLocked ? (
                    <Badge variant="destructive">Locked</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={user.isOfficeUser}
                      onCheckedChange={(checked) =>
                        onUpdateOfficeStatus(user, checked)
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {user.isOfficeUser ? "Office User" : "Regular User"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(user.lastLoginAttempt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  {user.activeDevice ? (
                    <div className="text-sm">
                      <p className="truncate max-w-md">
                        {user.activeDevice.userAgent}
                      </p>
                      <p className="text-muted-foreground">
                        {user.activeDevice.ip}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      No active device
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => onViewLogs(user)}>
                        <LayoutList className="h-4 w-4 mr-2" />
                        View Logs
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => onViewProjects(user)}>
                        <Building2 className="h-4 w-4 mr-2" />
                        View Projects
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => onLockUser(user)}>
                        <ShieldAlert className="h-4 w-4 mr-2" />
                        {user.isLocked ? "Unlock User" : "Lock User"}
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => onResetPassword(user)}>
                        <Key className="h-4 w-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => onForceLogout(user)}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Force Logout
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => onDeleteUser(user)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
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

// components/admins/AdminTable.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  MoreVertical, 
  Loader2, 
  Key, 
  FileText, 
  Trash2 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminInfo } from "@/lib/types/admins";

interface AdminTableProps {
  admins: AdminInfo[];
  loading: boolean;
  onAction: (action: string, admin: AdminInfo) => void;
}

export function AdminTable({ admins, loading, onAction }: AdminTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Username</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead>Last Login</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {admins.map((admin) => (
          <TableRow key={admin.username}>
            <TableCell className="font-medium">{admin.username}</TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                admin.isSuperAdmin 
                  ? "bg-purple-100 text-purple-700" 
                  : "bg-blue-100 text-blue-700"
              }`}>
                {admin.isSuperAdmin ? "Super Admin" : "Admin"}
              </span>
            </TableCell>
            <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
            <TableCell>
              {admin.lastLogin 
                ? new Date(admin.lastLogin).toLocaleDateString() 
                : "Never"}
            </TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                admin.isLocked 
                  ? "bg-red-100 text-red-700" 
                  : "bg-green-100 text-green-700"
              }`}>
                {admin.isLocked ? "Locked" : "Active"}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onAction('reset-password', admin)}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Reset Password
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onAction('view-logs', admin)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Logs
                  </DropdownMenuItem>
                  {!admin.isSuperAdmin && (
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => onAction('delete', admin)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Admin
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Key,
  Lock,
  Unlock,
  LogOut,
  FileText,
  FolderKanban,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { UserInfo } from "@/lib/types/users";

interface UserActionsProps {
  user: UserInfo;
  onAction: (action: string) => void;
}

export function UserActions({ user, onAction }: UserActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Quick Actions */}
        <DropdownMenuItem onClick={() => onAction("reset-password")}>
          <Key className="mr-2 h-4 w-4" />
          Reset Password
        </DropdownMenuItem>
        {user.isLocked ? (
          <DropdownMenuItem onClick={() => onAction("unlock")}>
            <Unlock className="mr-2 h-4 w-4" />
            Unlock User
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onAction("lock")}>
            <Lock className="mr-2 h-4 w-4" />
            Lock User
          </DropdownMenuItem>
        )}
        {user.activeDevice && (
          <DropdownMenuItem onClick={() => onAction("logout")}>
            <LogOut className="mr-2 h-4 w-4" />
            Force Logout
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* View Details */}
        <DropdownMenuItem onClick={() => onAction("view-logs")}>
          <FileText className="mr-2 h-4 w-4" />
          View Logs
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("manage-projects")}>
          <FolderKanban className="mr-2 h-4 w-4" />
          Manage Projects
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Danger Zone */}
        <DropdownMenuItem
          className="text-red-600"
          onClick={() => onAction("delete-user")}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

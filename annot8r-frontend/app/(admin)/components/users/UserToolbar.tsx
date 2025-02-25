// app/(admin)/components/users/UserToolbar.tsx
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserStatus } from "@/lib/types/users";

interface UserToolbarProps {
  onCreateUser: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: UserStatus;
  onStatusFilterChange: (status: UserStatus) => void;
}

export function UserToolbar({
  onCreateUser,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: UserToolbarProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-4">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-[300px]"
        />
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onCreateUser}>
        <UserPlus className="mr-2 h-4 w-4" />
        Create User
      </Button>
    </div>
  );
}
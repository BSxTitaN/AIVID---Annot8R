import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserStatus } from '@/lib/types/users';

interface UserFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedStatus: UserStatus;
  onStatusChange: (value: UserStatus) => void;
}

export function UserFilters({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
}: UserFiltersProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Input
        placeholder="Search by username..."
        className="max-w-xs"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="User Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Users</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="locked">Locked</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
// components/table/UserTable.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { UserStatus } from './UserStatus';
import { DeviceInfo } from './DeviceInfo';
import { ActivityInfo } from './ActivityInfo';
import { FailedAttempts } from './FailedAttempts';
import { UserActions } from './UserActions';
import { SortIndicator } from './SortIndicator';
import { SortConfig, SortField, UserInfo } from '@/lib/types/users';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface UserTableProps {
  users: UserInfo[];
  loading: boolean;
  sort: SortConfig;
  onSort: (field: SortField) => void;
  onAction: (action: string, user: UserInfo) => void;
  onOfficeUserToggle: (username: string, isOfficeUser: boolean) => Promise<void>;
}

export function UserTable({
  users,
  loading,
  sort,
  onSort,
  onAction,
  onOfficeUserToggle
}: UserTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSort('username')}
          >
            Username{' '}
            <SortIndicator
              field="username"
              activeField={sort.field}
              order={sort.order}
            />
          </TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Current Device</TableHead>
          <TableHead>Last Activity</TableHead>
          <TableHead>Failed Attempts</TableHead>
          <TableHead>Office User</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="h-32 text-center">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            </TableCell>
          </TableRow>
        ) : users.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="h-32 text-center text-muted-foreground"
            >
              No users found
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user._id}>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell>
                <UserStatus user={user} />
              </TableCell>
              <TableCell>
                <DeviceInfo device={user.activeDevice} />
              </TableCell>
              <TableCell>
                <ActivityInfo activities={user.activityLog} />
              </TableCell>
              <TableCell>
                <FailedAttempts count={user.failedLoginAttempts} />
              </TableCell>
              <TableCell>
              <Switch
                  checked={Boolean(user.isOfficeUser)}  // Ensure boolean conversion
                  onCheckedChange={async (checked) => {
                    try {
                      await onOfficeUserToggle(user.username, checked);
                    } catch {
                      toast.error("Failed to update office user status");
                    }
                  }}
                />
              </TableCell>
              <TableCell className="text-right">
                <UserActions user={user} onAction={(action) => onAction(action, user)} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
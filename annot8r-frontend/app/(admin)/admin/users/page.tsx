// app/(admin)/admin/users/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserInfo, SortConfig, UserStatus, PanelState } from "@/lib/types/users";
import { 
  getAllUsers, 
  deleteUser, 
  lockUser, 
  unlockUser, 
  resetPassword,
  forceLogoutUser,
  updateOfficeStatus 
} from "@/lib/apis/users";
import { UserToolbar } from "../../components/users/UserToolbar";
import { DataTable } from "../../components/users/DataTable";
import { CreateUserDialog } from "../../components/users/CreateUserDialog";
import { DeleteUserDialog } from "../../components/users/DeleteUserDialog";
import { LockUserDialog } from "../../components/users/LockUserDialog";
import { ResetPasswordDialog } from "../../components/users/ResetPasswordDialog";
import { SidePanel } from "../../components/SidePanel";
import { UserSecurityLogs } from "../../components/users/UserSecurityLogs";
import { UserProjects } from "../../components/users/UserProjects";

export default function UsersPage() {
  // State management
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus>("all");
  const [sort, setSort] = useState<SortConfig>({
    field: "username",
    order: "asc",
  });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);

  // Side panel state
  const [panel, setPanel] = useState<PanelState>({
    type: null,
    user: null,
  });

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllUsers();
      setUsers(response.users);
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // User actions
  const handleCreateUser = async () => {
    await fetchUsers();
    setCreateDialogOpen(false);
  };

  const handleDeleteUser = async (user: UserInfo) => {
    try {
      await deleteUser(user.username);
      toast.success("User deleted successfully");
      await fetchUsers();
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error("Failed to delete user");
      console.error(error);
    }
  };

  const handleLockUser = async (user: UserInfo, reason?: string) => {
    try {
      if (user.isLocked) {
        await unlockUser(user.username);
        toast.success("User unlocked successfully");
      } else {
        await lockUser(user.username, reason);
        toast.success("User locked successfully");
      }
      await fetchUsers();
      setLockDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error(`Failed to ${user.isLocked ? "unlock" : "lock"} user`);
      console.error(error);
    }
  };

  const handleResetPassword = async (user: UserInfo, newPassword: string) => {
    try {
      await resetPassword(user.username, newPassword);
      toast.success("Password reset successfully");
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error("Failed to reset password");
      console.error(error);
    }
  };

  const handleForceLogout = async (user: UserInfo) => {
    try {
      await forceLogoutUser(user.username);
      toast.success("User logged out successfully");
      await fetchUsers();
    } catch (error) {
      toast.error("Failed to force logout");
      console.error(error);
    }
  };

  const handleUpdateOfficeStatus = async (user: UserInfo, isOfficeUser: boolean) => {
    try {
      await updateOfficeStatus(user.username, isOfficeUser);
      toast.success("User status updated successfully");
      await fetchUsers();
    } catch (error) {
      toast.error("Failed to update user status");
      console.error(error);
    }
  };

  // Filter and sort users
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.username
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "locked" && user.isLocked) ||
      (statusFilter === "active" && !user.isLocked);
    return matchesSearch && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const multiplier = sort.order === "asc" ? 1 : -1;

    switch (sort.field) {
      case "username":
        return a.username.localeCompare(b.username) * multiplier;
      case "lastLogin":
        // Use lastLoginAttempt since lastLogin isn't available
        return (
          (new Date(a.lastLoginAttempt).getTime() -
            new Date(b.lastLoginAttempt).getTime()) *
          multiplier
        );
      case "createdAt":
        // Since we don't have createdAt, fall back to username
        return a.username.localeCompare(b.username) * multiplier;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <UserToolbar
        onCreateUser={() => setCreateDialogOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Users Table */}
      <DataTable
        users={sortedUsers}
        loading={loading}
        sort={sort}
        onSort={setSort}
        onViewLogs={(user) => setPanel({ type: "logs", user })}
        onViewProjects={(user) => setPanel({ type: "projects", user })}
        onLockUser={(user) => {
          setSelectedUser(user);
          setLockDialogOpen(true);
        }}
        onResetPassword={(user) => {
          setSelectedUser(user);
          setResetPasswordDialogOpen(true);
        }}
        onDeleteUser={(user) => {
          setSelectedUser(user);
          setDeleteDialogOpen(true);
        }}
        onForceLogout={handleForceLogout}
        onUpdateOfficeStatus={handleUpdateOfficeStatus}
      />

      {/* Dialogs */}
      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateUser}
      />

      {selectedUser && (
        <>
          <DeleteUserDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            user={selectedUser}
            onConfirm={() => handleDeleteUser(selectedUser)}
          />

          <LockUserDialog
            open={lockDialogOpen}
            onOpenChange={setLockDialogOpen}
            user={selectedUser}
            onConfirm={(reason) => handleLockUser(selectedUser, reason)}
          />

          <ResetPasswordDialog
            open={resetPasswordDialogOpen}
            onOpenChange={setResetPasswordDialogOpen}
            user={selectedUser}
            onConfirm={(password) => handleResetPassword(selectedUser, password)}
          />
        </>
      )}

      {/* Side Panels */}
      {panel.user && panel.type === "logs" && (
        <SidePanel
          open={true}
          onClose={() => setPanel({ type: null, user: null })}
          title={`Security Logs - ${panel.user.username}`}
        >
          <UserSecurityLogs user={panel.user} />
        </SidePanel>
      )}

      {panel.user && panel.type === "projects" && (
        <SidePanel
          open={true}
          onClose={() => setPanel({ type: null, user: null })}
          title={`Projects - ${panel.user.username}`}
        >
          <UserProjects user={panel.user} />
        </SidePanel>
      )}
    </div>
  );
}
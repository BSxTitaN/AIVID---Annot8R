"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DialogState,
  PanelState,
  SortConfig,
  SortField,
  UserInfo,
  UserStatus,
} from "@/lib/types/users";
import { useUsers } from "../user-hooks/useUsers";
import { useUserActions } from "../user-hooks/useUserAction";
import { UserFilters } from "./UserFilters";
import { UserTable } from "./UserTable";
import { Pagination } from "./Pagination";
import { ActionDialog } from "./ActionDialog";
import { LastUpdated } from "./LastUpdated";
import { LogsPanel } from "./LogsPanel";
import { ProjectsPanel } from "./ProjectsPanel";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateUserDialog } from "./CreateUserDialog";

export default function UsersPage() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>("all");
  const [sort, setSort] = useState<SortConfig>({
    field: "createdAt",
    order: "desc",
  });
  const [dialogState, setDialogState] = useState<DialogState>({
    type: null,
    user: null,
  });
  const [panelState, setPanelState] = useState<PanelState>({
    type: null,
    user: null,
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Hooks
  const {
    users,
    loading,
    currentPage,
    totalPages,
    lastRefreshed,
    setCurrentPage,
    fetchUsers,
  } = useUsers();

  const { resetPassword, lockUser, unlockUser, forceLogout, deleteUser, toggleOfficeUser } =
    useUserActions(() => {
      fetchUsers(currentPage, searchQuery, selectedStatus, sort, false);
      setDialogState({ type: null, user: null });
    });

  // Handlers
  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleStatusChange = useCallback(
    (value: UserStatus) => {
      setSelectedStatus(value);
      setCurrentPage(1);
    },
    [setCurrentPage]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setCurrentPage(1);
    },
    [setCurrentPage]
  );

  const handleAction = useCallback((action: string, user: UserInfo) => {
    if (action === "view-logs" || action === "manage-projects") {
      // Ensure we're using setTimeout to avoid any race conditions
      setTimeout(() => {
        setPanelState({
          type: action === "view-logs" ? "logs" : "projects",
          user,
        });
      }, 0);
      return;
    }

    setDialogState({ type: action as DialogState["type"], user });
  }, []);

  // Effects
  useEffect(() => {
    fetchUsers(currentPage, searchQuery, selectedStatus, sort);
  }, [fetchUsers, currentPage, searchQuery, selectedStatus, sort]);

  const handlePanelClose = useCallback(() => {
    setPanelState({ type: null, user: null });
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogState({ type: null, user: null });
  }, []);

  return (

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle>Users Management</CardTitle>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  size="sm"
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </div>
              <LastUpdated
                timestamp={lastRefreshed}
                onRefresh={() =>
                  fetchUsers(currentPage, searchQuery, selectedStatus, sort)
                }
              />
            </CardHeader>
            <CardContent>
              <UserFilters
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                selectedStatus={selectedStatus}
                onStatusChange={handleStatusChange}
              />

              <div className="rounded-md border">
                <UserTable
                  users={users}
                  loading={loading}
                  sort={sort}
                  onSort={handleSort}
                  onAction={handleAction}
                  onOfficeUserToggle={toggleOfficeUser}
                />
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </CardContent>
          </Card>

          <ActionDialog
            state={dialogState}
            onClose={handleDialogClose}
            onAction={{
              resetPassword,
              lockUser,
              unlockUser,
              forceLogout,
              deleteUser,
            }}
          />

          {/* Side Panels */}
          <LogsPanel
            open={panelState.type === "logs"}
            onClose={handlePanelClose}
            username={panelState.user?.username}
          />

          <ProjectsPanel
            open={panelState.type === "projects"}
            onClose={handlePanelClose}
            username={panelState.user?.username}
          />

          <CreateUserDialog
            isOpen={isCreateDialogOpen}
            onClose={() => setIsCreateDialogOpen(false)}
            onSuccess={() => {
              fetchUsers(currentPage, searchQuery, selectedStatus, sort, false);
            }}
          />
        </div>
  );
}

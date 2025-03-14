"use client";

import { useCallback } from "react";
import { Users, UserCog } from "lucide-react";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} from "@/lib/api/users";
import {
  EntityManagement,
  EntityTabConfig,
} from "@/components/admin/entity/entity-management";
import { 
  UserProfile, 
  PaginatedResponse, 
  ApiResponse, 
  CreateUserRequest, 
  UpdateUserRequest 
} from "@/lib/types";

// Define tab configuration for users
const userTabConfig: EntityTabConfig[] = [
  {
    id: "all",
    label: "All",
    icon: Users,
    filter: () => true, // Show all users
  },
  {
    id: "active",
    label: "Active",
    filter: (user) => user.isActive,
  },
  {
    id: "inactive",
    label: "Inactive",
    filter: (user) => !user.isActive,
  },
  {
    id: "office",
    label: "Office",
    icon: UserCog,
    filter: (user) => user.isOfficeUser,
  },
];

export function UserManagement() {
  const fetchUsersAction = useCallback(
    (page: number, limit: number): Promise<ApiResponse<PaginatedResponse<UserProfile>>> => {
      return getUsers(page, limit);
    },
    []
  );

  const createUserAction = useCallback((data: unknown): Promise<ApiResponse<UserProfile>> => {
    return createUser(data as CreateUserRequest);
  }, []);

  const updateUserAction = useCallback(
    (id: string, data: unknown): Promise<ApiResponse<UserProfile>> => {
      return updateUser(id, data as UpdateUserRequest);
    },
    []
  );

  const deleteUserAction = useCallback((id: string): Promise<ApiResponse<null>> => {
    return deleteUser(id);
  }, []);

  const resetUserPasswordAction = useCallback(
    (id: string, newPassword: string): Promise<ApiResponse<null>> => {
      return resetUserPassword(id, newPassword);
    },
    []
  );

  return (
    <EntityManagement
      entityType="users"
      title="User Accounts"
      description="Manage all user accounts and their permissions"
      icon={Users}
      singularName="User"
      pluralName="Users"
      fetchEntitiesAction={fetchUsersAction}
      createEntityAction={createUserAction}
      updateEntityAction={updateUserAction}
      deleteEntityAction={deleteUserAction}
      resetPasswordAction={resetUserPasswordAction}
      tabConfig={userTabConfig}
      createDialogProps={{
        title: "Add New User",
        description: "Create a new user account for the annotation platform.",
        submitLabel: "Create User",
      }}
      editDialogProps={{
        title: "Edit User",
        description: "Update information for {name}.",
        submitLabel: "Save Changes",
      }}
      resetPasswordDialogProps={{
        title: "Reset Password",
        description: "Set a new password for {name}.",
      }}
      deleteDialogProps={{
        title: "Delete User Account",
        description:
          "This will permanently delete the user account for {name}. This action cannot be undone and will remove all user data.",
      }}
    />
  );
}
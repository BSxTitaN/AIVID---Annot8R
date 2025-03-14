"use client";

import { useCallback } from "react";
import { Shield, UserCog } from "lucide-react";
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  resetAdminPassword,
} from "@/lib/api/admins";
import {
  EntityManagement,
  EntityTabConfig,
} from "@/components/admin/entity/entity-management";
import {
  UserProfile,
  PaginatedResponse,
  ApiResponse,
  CreateAdminRequest,
  UpdateAdminRequest,
} from "@/lib/types";

// Define tab configuration for admins
const adminTabConfig: EntityTabConfig[] = [
  {
    id: "all",
    label: "All",
    icon: UserCog,
    filter: () => true, // Show all admins
  },
  {
    id: "active",
    label: "Active",
    filter: (admin) => admin.isActive,
  },
  {
    id: "inactive",
    label: "Inactive",
    filter: (admin) => !admin.isActive,
  },
];

export function AdminManagement() {
  const fetchAdminsAction = useCallback(
    (
      page: number,
      limit: number
    ): Promise<ApiResponse<PaginatedResponse<UserProfile>>> => {
      return getAdmins(page, limit);
    },
    []
  );

  const createAdminAction = useCallback(
    (data: unknown): Promise<ApiResponse<UserProfile>> => {
      return createAdmin(data as CreateAdminRequest);
    },
    []
  );

  const updateAdminAction = useCallback(
    (id: string, data: unknown): Promise<ApiResponse<UserProfile>> => {
      return updateAdmin(id, data as UpdateAdminRequest);
    },
    []
  );

  const deleteAdminAction = useCallback(
    (id: string): Promise<ApiResponse<null>> => {
      return deleteAdmin(id);
    },
    []
  );

  const resetAdminPasswordAction = useCallback(
    (id: string, newPassword: string): Promise<ApiResponse<null>> => {
      return resetAdminPassword(id, newPassword);
    },
    []
  );

  return (
    <EntityManagement
      entityType="admins"
      title="Administrator Accounts"
      description="Manage all administrators with elevated platform privileges"
      icon={Shield}
      singularName="Admin"
      pluralName="Admins"
      fetchEntitiesAction={fetchAdminsAction}
      createEntityAction={createAdminAction}
      updateEntityAction={updateAdminAction}
      deleteEntityAction={deleteAdminAction}
      resetPasswordAction={resetAdminPasswordAction}
      tabConfig={adminTabConfig}
      createDialogProps={{
        title: "Add New Administrator",
        description:
          "Create a new administrator account with platform management privileges.",
        submitLabel: "Create Administrator",
      }}
      editDialogProps={{
        title: "Edit Administrator",
        description: "Update information for {name}.",
        submitLabel: "Save Changes",
      }}
      resetPasswordDialogProps={{
        title: "Reset Administrator Password",
        description: "Set a new password for administrator {name}.",
      }}
      deleteDialogProps={{
        title: "Delete Administrator Account",
        description:
          "This will permanently delete the admin account for {name}. This action cannot be undone and will remove all administrator privileges.",
      }}
    />
  );
}

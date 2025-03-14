// components/admin/entity/entity-management-wrapper.tsx
import { Suspense } from "react";

export interface EntityManagementWrapperProps {
  entityType: "users" | "admins";
  title: string;
  description: string;
  iconType: string; // Use a string identifier instead of passing the component
  singularName: string;
  pluralName: string;
  tabConfig: Array<{
    id: string;
    label: string;
    icon?: string;
    filter: string; // Serializable filter condition
  }>;
  createDialogProps: {
    title: string;
    description: string;
    submitLabel: string;
  };
  editDialogProps: {
    title: string;
    description: string;
    submitLabel: string;
  };
  resetPasswordDialogProps: {
    title: string;
    description: string;
  };
  deleteDialogProps: {
    title: string;
    description: string;
  };
}

export function EntityManagementWrapper(props: EntityManagementWrapperProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EntityManagementUI {...props} />
    </Suspense>
  );
}
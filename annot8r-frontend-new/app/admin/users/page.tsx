import { Metadata } from "next";
import { UserManagement } from "@/components/admin/users/user-management";

export const metadata: Metadata = {
  title: "User Management - Annot8R Admin",
  description: "Manage users in the annotation platform",
};

export default function UsersPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page header with contextual information */}
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Create and manage user accounts for the annotation platform.
        </p>
      </div>

      {/* User Management Component */}
      <UserManagement />
    </div>
  );
}
import { Metadata } from "next";
import { AdminManagement } from "@/components/admin/admin/admin-management";

export const metadata: Metadata = {
  title: "Admin Management - Annot8R Admin",
  description: "Manage administrator accounts in the annotation platform",
};

export default function AdminsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page header with contextual information */}
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Management</h1>
        <p className="text-muted-foreground">
          Create and manage administrator accounts with privileged access to the
          platform.
        </p>
      </div>

      {/* Admin Management Component */}
      <AdminManagement />
    </div>
  );
}
// app/(admin)/admin/admins/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAllAdmins,
  deleteAdmin,
  resetAdminPassword,
} from "@/lib/apis/admins";
import type { AdminInfo } from "@/lib/types/admins";
import { AdminToolbar } from "../../components/admins/AdminToolbar";
import { AdminDataTable } from "../../components/admins/AdminDataTable";
import { CreateAdminDialog } from "../../components/admins/CreateAdminDialog";
import { DeleteAdminDialog } from "../../components/admins/DeleteAdminDialog";
import { ResetAdminPasswordDialog } from "../../components/admins/ResetAdminPasswordDialog";
import { SidePanel } from "../../components/SidePanel";
import { AdminSecurityLogs } from "../../components/admins/AdminSecurityLogs";

export default function AdminPage() {
  // State management
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminInfo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);

  // Side panel state
  const [selectedAdminForLogs, setSelectedAdminForLogs] = useState<AdminInfo | null>(null);

  // Fetch admins
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllAdmins();
      setAdmins(response);
    } catch (error) {
      toast.error("Failed to fetch admins");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Admin actions
  const handleCreateAdmin = async () => {
    await fetchAdmins();
    setCreateDialogOpen(false);
  };

  const handleDeleteAdmin = async (admin: AdminInfo) => {
    try {
      await deleteAdmin(admin.username);
      toast.success("Admin deleted successfully");
      await fetchAdmins();
      setDeleteDialogOpen(false);
      setSelectedAdmin(null);
    } catch (error) {
      toast.error("Failed to delete admin");
      console.error(error);
    }
  };

  const handleResetPassword = async (admin: AdminInfo, newPassword: string) => {
    try {
      await resetAdminPassword(admin.username, newPassword);
      toast.success("Password reset successfully");
      setResetPasswordDialogOpen(false);
      setSelectedAdmin(null);
    } catch (error) {
      toast.error("Failed to reset password");
      console.error(error);
    }
  };

  // Filter admins
  const filteredAdmins = admins.filter((admin) =>
    admin.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <AdminToolbar
        onCreateAdmin={() => setCreateDialogOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Admins Table */}
      <AdminDataTable
        admins={filteredAdmins}
        loading={loading}
        onViewLogs={(admin) => setSelectedAdminForLogs(admin)}
        onResetPassword={(admin) => {
          setSelectedAdmin(admin);
          setResetPasswordDialogOpen(true);
        }}
        onDeleteAdmin={(admin) => {
          setSelectedAdmin(admin);
          setDeleteDialogOpen(true);
        }}
      />

      {/* Dialogs */}
      <CreateAdminDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateAdmin}
      />

      {selectedAdmin && (
        <>
          <DeleteAdminDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            admin={selectedAdmin}
            onConfirm={() => handleDeleteAdmin(selectedAdmin)}
          />

          <ResetAdminPasswordDialog
            open={resetPasswordDialogOpen}
            onOpenChange={setResetPasswordDialogOpen}
            admin={selectedAdmin}
            onConfirm={(password) => handleResetPassword(selectedAdmin, password)}
          />
        </>
      )}

      {/* Side Panel */}
      {selectedAdminForLogs && (
        <SidePanel
          open={true}
          onClose={() => setSelectedAdminForLogs(null)}
          title={`Security Logs - ${selectedAdminForLogs.username}`}
        >
          <AdminSecurityLogs admin={selectedAdminForLogs} />
        </SidePanel>
      )}
    </div>
  );
}
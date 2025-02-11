// app/(admin)/admins/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/auth";
import { LastUpdated } from "../users/LastUpdated";
import { AdminTable } from "./AdminTable";
import { CreateAdminDialog } from "./CreateAdminDialog";
import { AdminActionDialog } from "./AdminActionDialog";
import { AdminLogsPanel } from "./AdminsLogPanel";
import { fetchWithAuth } from "@/lib/apis/config";
import { AdminDialogState, AdminInfo } from "@/lib/types/admins";

interface AdminState {
  admins: AdminInfo[];
  loading: boolean;
  lastRefreshed: Date;
}

// Raw admin data from API
interface RawAdminInfo {
  username: string;
  isSuperAdmin: boolean;
  createdAt: Date;
  lastLogin?: Date;
  isLocked: boolean;
  lockReason?: string;
}

export default function AdminsPage() {
  const { user } = useAuth();
  const [state, setState] = useState<AdminState>({
    admins: [],
    loading: true,
    lastRefreshed: new Date()
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState<AdminDialogState>({
    type: null,
    admin: null
  });
  const [selectedAdminForLogs, setSelectedAdminForLogs] = useState<string | null>(null);

  // Transform raw admin data to include status
  const transformAdminData = useCallback((admin: RawAdminInfo): AdminInfo => ({
    ...admin,
    status: admin.isLocked ? 'locked' : 'active'
  }), []);

  // Fetch admins
  const fetchAdmins = useCallback(async (showLoading = true) => {
    if (showLoading) setState(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetchWithAuth('/auth/admins');
      
      const transformedAdmins = response.admins.map(transformAdminData);
  
      setState({
        admins: transformedAdmins,
        loading: false,
        lastRefreshed: new Date()
      });
    } catch {
      toast.error('Failed to fetch admins');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [transformAdminData]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAdminAction = useCallback((action: string, admin: RawAdminInfo) => {
    if (action === 'view-logs') {
      setSelectedAdminForLogs(admin.username);
      return;
    }

    const adminWithStatus = transformAdminData(admin);
    setDialogState({
      type: action as AdminDialogState['type'],
      admin: adminWithStatus
    });
  }, [transformAdminData]);

  const handleCreateSuccess = useCallback(async () => {
    await fetchAdmins(false);
    setIsCreateDialogOpen(false);
    toast.success('Admin created successfully');
  }, [fetchAdmins]);

  const handleActionSuccess = useCallback(async () => {
    await fetchAdmins(false);
    setDialogState({ type: null, admin: null });
    toast.success('Action completed successfully');
  }, [fetchAdmins]);

  // Check if user is super admin
  if (!user?.isSuperAdmin) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Only super admins can access this page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle>Admin Management</CardTitle>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="sm"
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Admin
            </Button>
          </div>
          <LastUpdated
            timestamp={state.lastRefreshed}
            onRefresh={() => fetchAdmins()}
          />
        </CardHeader>
        <CardContent>
          <AdminTable
            admins={state.admins}
            loading={state.loading}
            onAction={handleAdminAction}
          />
        </CardContent>
      </Card>

      <CreateAdminDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <AdminActionDialog
        state={dialogState}
        onClose={() => setDialogState({ type: null, admin: null })}
        onSuccess={handleActionSuccess}
      />

      <AdminLogsPanel
        username={selectedAdminForLogs}
        onClose={() => setSelectedAdminForLogs(null)}
      />
    </div>
  );
}
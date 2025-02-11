// components/admins/AdminActionDialog.tsx
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/apis/config";
import { Loader2 } from "lucide-react";
import { AdminDialogState } from "@/lib/types/admins";

interface AdminActionDialogProps {
  state: AdminDialogState;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminActionDialog({ state, onClose, onSuccess }: AdminActionDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!state.admin) return;

    setLoading(true);
    try {
      let response;

      if (state.type === 'delete') {
        response = await fetchWithAuth(`/auth/admins/${state.admin.username}/delete`, {
          method: 'POST'
        });
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to delete admin');
        }

        toast.success('Admin deleted successfully');
      } else if (state.type === 'reset-password') {
        if (!newPassword) {
          toast.error("Please enter a new password");
          return;
        }

        if (newPassword.length < 8) {
          toast.error("Password must be at least 8 characters long");
          return;
        }

        response = await fetchWithAuth('/auth/admin/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            username: state.admin.username,
            newPassword
          })
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to reset password');
        }

        toast.success('Password reset successfully');
      }

      onSuccess();
      setNewPassword("");
    } catch (error) {
      console.error('Action failed:', error);
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={!!state.type} onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {state.type === 'delete' ? 'Delete Admin' : 'Reset Admin Password'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {state.type === 'delete' 
              ? `Are you sure you want to delete admin "${state.admin?.username}"? This action cannot be undone.`
              : 'Enter new password for the admin account:'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {state.type === 'reset-password' && (
          <div className="grid gap-4 py-4">
            <Input
              type="password"
              placeholder="Enter new password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAction}
            disabled={loading || (state.type === 'reset-password' && !newPassword)}
            className={state.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {state.type === 'delete' ? 'Deleting...' : 'Resetting...'}
              </>
            ) : (
              state.type === 'delete' ? 'Delete Admin' : 'Reset Password'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
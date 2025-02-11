// components/ActionDialog.tsx
import { useCallback, useState, useEffect } from "react";
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
import { DialogState } from "@/lib/types/users";

interface ActionDialogProps {
  state: DialogState;
  onClose: () => void;
  onAction: {
    resetPassword: (username: string, password: string) => Promise<void>;
    lockUser: (username: string, reason: string) => Promise<void>;
    unlockUser: (username: string) => Promise<void>;
    forceLogout: (username: string) => Promise<void>;
    deleteUser?: (username: string) => Promise<void>;
  };
}

export function ActionDialog({ state, onClose, onAction }: ActionDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Reset form states when dialog type changes
  useEffect(() => {
    if (state.type !== null) {
      setIsOpen(true);
    }
    setNewPassword("");
    setLockReason("");
  }, [state.type]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setNewPassword("");
    setLockReason("");
    onClose();
  }, [onClose]);

  const handleAction = async () => {
    if (!state.user) return;

    try {
      switch (state.type) {
        case "reset-password":
          await onAction.resetPassword(state.user.username, newPassword);
          break;
        case "lock":
          await onAction.lockUser(state.user.username, lockReason);
          break;
        case "unlock":
          await onAction.unlockUser(state.user.username);
          break;
        case "delete-user":
          if (onAction.deleteUser) {
            await onAction.deleteUser(state.user.username);
          }
          break;
      }
      handleClose();
    } catch (error) {
      console.error("Action failed:", error);
    }
  };

  const getDialogContent = () => {
    switch (state.type) {
      case "reset-password":
        return {
          title: "Reset User Password",
          description: "Enter new password for user:",
          content: (
            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          ),
          isDisabled: !newPassword,
          actionLabel: "Reset Password",
        };
      case "lock":
        return {
          title: "Lock User",
          description: "Please provide a reason for locking this user:",
          content: (
            <Input
              placeholder="Enter reason for locking"
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
            />
          ),
          isDisabled: !lockReason,
          actionLabel: "Lock User",
        };
      case "unlock":
        return {
          title: "Unlock User",
          description: "Are you sure you want to unlock this user?",
          isDisabled: false,
          actionLabel: "Unlock User",
        };
      case "delete-user":
        return {
          title: "Delete User",
          description: `Are you sure you want to delete user "${state.user?.username}"? This will permanently delete all their data and projects. This action cannot be undone.`,
          isDisabled: false,
          actionLabel: "Delete User",
          variant: "destructive" as const,
        };
      default:
        return null;
    }
  };

  const dialogContent = getDialogContent();
  if (!dialogContent) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dialogContent.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {dialogContent.content && (
          <div className="grid gap-4 py-4">{dialogContent.content}</div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAction}
            disabled={dialogContent.isDisabled}
            className={
              dialogContent.variant === "destructive"
                ? "bg-destructive hover:bg-destructive/90"
                : ""
            }
          >
            {dialogContent.actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
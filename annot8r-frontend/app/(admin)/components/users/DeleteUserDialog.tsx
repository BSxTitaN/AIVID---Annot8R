// app/(admin)/components/users/DeleteUserDialog.tsx
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
  import type { UserInfo } from "@/lib/types/users";
  import { Loader2 } from "lucide-react";
  import { useState } from "react";
  
  interface DeleteUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserInfo;
    onConfirm: () => Promise<void>;
  }
  
  export function DeleteUserDialog({
    open,
    onOpenChange,
    user,
    onConfirm,
  }: DeleteUserDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
  
    const handleConfirm = async () => {
      setIsDeleting(true);
      await onConfirm();
      setIsDeleting(false);
    };
  
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the user {"'" + user.username + "'"}? This action
              cannot be undone.
              {user.isOfficeUser && (
                <p className="mt-2 text-yellow-600 dark:text-yellow-500">
                  Warning: This is an office user. Deleting them might affect office-related operations.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
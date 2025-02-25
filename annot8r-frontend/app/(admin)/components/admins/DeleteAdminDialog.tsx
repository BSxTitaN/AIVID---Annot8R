// app/(admin)/components/admins/DeleteAdminDialog.tsx
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
  import type { AdminInfo } from "@/lib/types/admins";
  import { Loader2 } from "lucide-react";
  import { useState } from "react";
  
  interface DeleteAdminDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    admin: AdminInfo;
    onConfirm: () => Promise<void>;
  }
  
  export function DeleteAdminDialog({
    open,
    onOpenChange,
    admin,
    onConfirm,
  }: DeleteAdminDialogProps) {
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
            <AlertDialogTitle>Delete Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the admin {"'" + admin.username + "'"}? This action
              cannot be undone.
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
                "Delete Admin"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
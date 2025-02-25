// app/(admin)/components/users/LockUserDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { UserInfo } from "@/lib/types/users";

interface LockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserInfo;
  onConfirm: (reason?: string) => Promise<void>;
}

export function LockUserDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
}: LockUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState(user.lockReason || "");

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await onConfirm(reason);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {user.isLocked ? "Unlock User" : "Lock User"}
          </DialogTitle>
          <DialogDescription>
            {user.isLocked
              ? `Are you sure you want to unlock the user "${user.username}"?`
              : `You are about to lock the user "${user.username}". They won't be able to access the system until unlocked.`}
          </DialogDescription>
        </DialogHeader>

        {!user.isLocked && (
          <div className="space-y-2">
            <Label htmlFor="reason">Lock Reason</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for locking the user..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            variant={user.isLocked ? "default" : "destructive"}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {user.isLocked ? "Unlocking..." : "Locking..."}
              </>
            ) : user.isLocked ? (
              "Unlock User"
            ) : (
              "Lock User"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Check, Loader2, XCircle } from "lucide-react";
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
import { fetchWithAuth } from '@/lib/apis/config';
import { toast } from 'sonner';

interface AdminProjectStatusProps {
  username: string;
  projectId: string;
  isSubmitted: boolean;
  submittedAt?: string;
  onStatusChange: () => void;
}

export function AdminProjectStatus({
  username,
  projectId,
  isSubmitted,
  submittedAt,
  onStatusChange
}: AdminProjectStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUnmark = async () => {
    try {
      setIsLoading(true);
      await fetchWithAuth(`/auth/users/${username}/projects/${projectId}/unsubmit`, {
        method: 'POST'
      });
      
      toast.success('Project status updated');
      onStatusChange();
    } catch {
      toast.error('Failed to update project status');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  if (!isSubmitted) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <XCircle className="h-4 w-4" />
        Not submitted
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-green-600">
        <Check className="h-4 w-4" />
        Submitted {submittedAt && `on ${new Date(submittedAt).toLocaleDateString()}`}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        disabled={isLoading}
      >
        Mark as Incomplete
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Project as Incomplete</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the project as incomplete and notify the user that they need to review their annotations. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnmark}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Mark as Incomplete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
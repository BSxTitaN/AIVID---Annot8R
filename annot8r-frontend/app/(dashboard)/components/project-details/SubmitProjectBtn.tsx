// SubmitProjectButton.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Check, Loader2, Send } from "lucide-react";
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

interface SubmitProjectButtonProps {
  userId: string;
  projectId: string;
  isSubmitted: boolean;
  onSubmissionChange: () => void;
}

export function SubmitProjectButton({ 
  userId, 
  projectId, 
  isSubmitted,
  onSubmissionChange 
}: SubmitProjectButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      await fetchWithAuth(`/projects/${userId}/${projectId}/submit`, {
        method: 'POST'
      });
      
      toast.success('Project submitted successfully');
      onSubmissionChange();
    } catch {
      toast.error('Failed to submit project');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2"
        variant={isSubmitted ? "secondary" : "default"}
        disabled={isLoading}
      >
        {isSubmitted ? (
          <>
            <Check className="h-4 w-4" />
            Submitted
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit Project
          </>
        )}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this project? This will mark all annotations as complete and notify the admin for review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmit}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Project
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, HelpCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { submitForReview, getUserProjectStats } from "@/lib/api/user-projects";
import { useRouter } from "next/navigation";
import { UserAssignment, AssignmentStatus } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SubmissionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  assignment?: UserAssignment;
  onSuccess: () => void;
}

export function SubmissionForm({
  open,
  onOpenChange,
  projectId,
  assignment,
  onSuccess,
}: SubmissionFormProps) {
  const router = useRouter();
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableAssignments, setAvailableAssignments] = useState<
    UserAssignment[]
  >([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setIsLoadingAssignments(true);
    try {
      const response = await getUserProjectStats(projectId);
      if (response.success && response.data?.assignments) {
        setAvailableAssignments(response.data.assignments);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setIsLoadingAssignments(false);
    }
  }, [projectId]);

  // Fetch all assignments when the dialog opens
  useEffect(() => {
    if (open) {
      fetchAssignments();
    }
  }, [fetchAssignments, open, projectId]);

  const handleSubmitForReview = async () => {
    // First check if we have the provided assignment
    let targetAssignment = assignment;

    // If no active assignment was passed as prop, look for any valid assignment
    if (!targetAssignment) {
      // Find any assignment in assignable states (including NEEDS_REVISION for previously flagged submissions)
      targetAssignment = availableAssignments.find(
        (a) =>
          a.status === AssignmentStatus.ASSIGNED ||
          a.status === AssignmentStatus.IN_PROGRESS ||
          a.status === AssignmentStatus.NEEDS_REVISION
      );
    }

    if (!targetAssignment) {
      toast.error("No active assignment found", {
        description: "Please contact support if this issue persists",
      });
      return;
    }

    if (submissionNotes.trim().length > 500) {
      toast.error("Message is too long", {
        description: "Please keep your message under 500 characters",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await submitForReview(
        projectId,
        targetAssignment.id,
        submissionNotes
      );
      if (response.success && response.data) {
        toast.success("Submission created successfully", {
          description: "Your annotations have been submitted for review.",
        });
        onOpenChange(false);
        setSubmissionNotes("");
        onSuccess();
        router.push(`/dashboard/projects/${projectId}?tab=submissions`);
      } else {
        toast.error("Failed to create submission", {
          description: response.error || "Please try again later",
        });
      }
    } catch (error) {
      console.error("Error submitting for review:", error);
      toast.error("Error submitting for review", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Submit Annotations for Review
          </DialogTitle>
          <DialogDescription>
            Your annotations will be submitted for review. You won&apos;t be
            able to make further changes until the review is complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pr-1">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="submission-notes" className="text-sm font-medium">
                Add notes for the reviewer:
              </label>
              <span className="text-xs text-muted-foreground">
                {submissionNotes.length}/500 characters
              </span>
            </div>
            <Textarea
              id="submission-notes"
              placeholder="Add any notes or context about your annotations..."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              rows={4}
              className="resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Explain any challenges you faced or special considerations about
              your annotations.
            </p>
          </div>

          <Alert className="py-2 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <HelpCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle>Submission Process</AlertTitle>
            <AlertDescription className="text-xs">
              A reviewer will examine your annotations and either approve them
              or request changes. You won&apos;t be able to edit your
              annotations while they&apos;re under review.
            </AlertDescription>
          </Alert>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-sm py-2">
                What happens after I submit?
              </AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal ml-4 text-xs space-y-1 text-muted-foreground">
                  <li>Your submission will enter the review queue.</li>
                  <li>
                    A reviewer will examine your annotations for accuracy.
                  </li>
                  <li>
                    If all annotations meet the standards, your submission will
                    be approved.
                  </li>
                  <li>
                    If changes are needed, you&apos;ll receive specific
                    feedback.
                  </li>
                  <li>You can then make the requested changes and resubmit.</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Alert className="py-2" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription className="text-xs">
              Once submitted, you won&apos;t be able to edit your annotations
              until the review is complete.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="mt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isLoadingAssignments}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitForReview}
            disabled={isSubmitting || isLoadingAssignments}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : isLoadingAssignments ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Submit for Review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

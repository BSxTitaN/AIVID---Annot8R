import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  FileText,
  RefreshCw,
  Clock,
  XCircle,
  Calendar,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getUserProjectSubmissions,
  getUserSubmission,
} from "@/lib/api/user-projects";
import {
  Submission,
  SubmissionStatus,
  UserAssignment,
  AssignmentStatus,
} from "@/lib/types";
import { SubmissionDetail } from "@/components/dashboard/project-detail/submission-detail";
import { SubmissionForm } from "@/components/dashboard/project-detail/submission-form";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface SubmissionsTabProps {
  projectId: string;
  canSubmitForReview: boolean;
  assignments: UserAssignment[];
  onRefreshStats: () => void;
}

export function SubmissionsTab({
  projectId,
  canSubmitForReview,
  assignments,
  onRefreshStats,
}: SubmissionsTabProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);
  const [viewingDetail, setViewingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getUserProjectSubmissions(projectId, page, 10);
      console.log(response);
      if (response.success && response.data) {
        setSubmissions(response.data.data);
        setTotalPages(response.data.totalPages);
      } else {
        setError(response.error || "Failed to load submissions");
        toast.error("Error loading submissions", {
          description: response.error || "Please try again later",
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      toast.error("Error", { description: "Failed to load submissions" });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, page]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleViewSubmission = useCallback(
    async (submissionId: string) => {
      setIsLoadingSubmission(true);
      setViewingDetail(true);
      try {
        const response = await getUserSubmission(projectId, submissionId);
        if (response.success && response.data) {
          setSelectedSubmission(response.data);
        } else {
          toast.error("Failed to load submission details", {
            description: response.error || "Please try again later",
          });
        }
      } catch (error) {
        console.error("Error loading submission:", error);
        toast.error("Error loading submission details", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      } finally {
        setIsLoadingSubmission(false);
      }
    },
    [projectId]
  );

  const handleBackToList = () => {
    setSelectedSubmission(null);
    setViewingDetail(false);
  };

  // Function to check if submission is possible
  const canActuallySubmitForReview = () => {
    // Check if we have assignments
    if (!assignments || assignments.length === 0) {
      return false;
    }

    // Check if there's at least one assignment in a state that allows submission
    const hasSubmittableAssignment = assignments.some(
      (a) =>
        a.status === AssignmentStatus.ASSIGNED ||
        a.status === AssignmentStatus.IN_PROGRESS ||
        a.status === AssignmentStatus.NEEDS_REVISION
    );

    return canSubmitForReview && hasSubmittableAssignment;
  };

  const getStatusIndicator = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return {
          icon: <Clock className="h-5 w-5" />,
          label: "Submitted",
          color:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          description: "Your submission is awaiting review.",
        };
      case SubmissionStatus.UNDER_REVIEW:
        return {
          icon: <Clock className="h-5 w-5" />,
          label: "Under Review",
          color:
            "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
          description: "Your submission is currently being reviewed.",
        };
      case SubmissionStatus.REJECTED:
        return {
          icon: <XCircle className="h-5 w-5" />,
          label: "Changes Requested",
          color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
          description: "Your submission needs some changes.",
        };
      case SubmissionStatus.APPROVED:
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          label: "Approved",
          color:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
          description: "Your submission has been approved.",
        };
      default:
        return {
          icon: <FileText className="h-5 w-5" />,
          label: "Unknown",
          color:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
          description: "Status unknown",
        };
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Unknown date";
    }
  };

  const filteredSubmissions =
    statusFilter === "all"
      ? submissions
      : submissions.filter((submission) => submission.status === statusFilter);

  if (viewingDetail) {
    return (
      <SubmissionDetail
        submission={selectedSubmission}
        projectId={projectId}
        isLoading={isLoadingSubmission}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold">Submission History</h2>
          <p className="text-sm text-muted-foreground">
            Track the status of your annotation submissions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Submissions</SelectItem>
                <SelectItem value={SubmissionStatus.SUBMITTED}>
                  Submitted
                </SelectItem>
                <SelectItem value={SubmissionStatus.UNDER_REVIEW}>
                  Under Review
                </SelectItem>
                <SelectItem value={SubmissionStatus.REJECTED}>
                  Changes Requested
                </SelectItem>
                <SelectItem value={SubmissionStatus.APPROVED}>
                  Approved
                </SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchSubmissions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          {canActuallySubmitForReview() && (
            <Button onClick={() => setShowSubmitDialog(true)}>
              Submit for Review
            </Button>
          )}
        </div>
      </div>
      {canActuallySubmitForReview() && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle>Ready for Review</AlertTitle>
          <AlertDescription>
            You have annotated all assigned images and are ready to submit for
            review.
          </AlertDescription>
        </Alert>
      )}
      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : filteredSubmissions.length > 0 ? (
        <div className="space-y-6">
          {filteredSubmissions.map((submission) => {
            const statusInfo = getStatusIndicator(submission.status);
            return (
              <div
                key={submission.id}
                className="border rounded-lg shadow-sm bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewSubmission(submission.id)}
              >
                <div className="flex flex-col md:flex-row gap-4">
                  <div
                    className={cn(
                      "py-6 px-6 flex items-center justify-center",
                      statusInfo.color
                    )}
                    style={{ width: "120px" }}
                  >
                    {statusInfo.icon}
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-medium">
                          Submission #{submission.id.slice(-6)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1.5" />
                            {formatDate(submission.submittedAt)}
                          </span>
                          <span className="hidden md:inline">•</span>
                          <span>{submission.imageCount} images</span>
                        </div>
                      </div>
                      <Badge
                        className={cn("text-xs font-medium", statusInfo.color)}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {statusInfo.description}
                      </p>
                      {submission.status === SubmissionStatus.REJECTED && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
                          <p className="text-sm font-medium text-red-800 dark:text-red-400">
                            Changes Requested ({submission.flaggedImagesCount}{" "}
                            {submission.flaggedImagesCount === 1
                              ? "image"
                              : "images"}{" "}
                            flagged)
                          </p>
                          {submission.feedback && (
                            <p className="text-sm mt-1 text-red-700 dark:text-red-300 line-clamp-2">
                              &quot;{submission.feedback}&quot;
                            </p>
                          )}
                        </div>
                      )}
                      {submission.status === SubmissionStatus.APPROVED && (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium text-green-800 dark:text-green-400">
                            All images approved!
                          </p>
                          {submission.feedback && (
                            <p className="text-sm mt-1 text-green-700 dark:text-green-300 line-clamp-2">
                              &quot;{submission.feedback}&quot;
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button variant="ghost" size="sm">
                        View Details
                        <span className="sr-only">View submission details</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No submissions yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-md mx-auto">
            {canActuallySubmitForReview()
              ? "You've annotated all your assigned images. Submit them for review to get feedback."
              : "Complete annotating your assigned images to submit them for review."}
          </p>
          {canActuallySubmitForReview() && (
            <Button onClick={() => setShowSubmitDialog(true)}>
              Submit for Review
            </Button>
          )}
        </div>
      )}
      <SubmissionForm
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        projectId={projectId}
        assignment={assignments.find(
          (a) =>
            a.status === AssignmentStatus.ASSIGNED ||
            a.status === AssignmentStatus.IN_PROGRESS ||
            a.status === AssignmentStatus.NEEDS_REVISION
        )}
        onSuccess={onRefreshStats}
      />
    </div>
  );
}

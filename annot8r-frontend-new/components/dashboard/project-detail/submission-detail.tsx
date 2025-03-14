import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  User,
  MessageSquare,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Submission, SubmissionStatus } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SubmissionTimeline } from "./submission-timeline";

interface SubmissionDetailProps {
  submission: Submission | null;
  projectId: string;
  isLoading: boolean;
  onBack: () => void;
}

export function SubmissionDetail({
  submission,
  projectId,
  isLoading,
  onBack,
}: SubmissionDetailProps) {
  const router = useRouter();

  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Submitted
          </Badge>
        );
      case SubmissionStatus.UNDER_REVIEW:
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Under Review
          </Badge>
        );
      case SubmissionStatus.REJECTED:
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Changes Requested
          </Badge>
        );
      case SubmissionStatus.APPROVED:
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Approved
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "PPP 'at' p");
    } catch {
      return "Invalid date";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Button>
        </div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Submission Not Found</CardTitle>
            <CardDescription>
              The submission you&apos;re looking for doesn&apos;t exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onBack}>Return to Submissions</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusDetails = (() => {
    switch (submission.status) {
      case SubmissionStatus.SUBMITTED:
        return {
          icon: <Clock className="h-10 w-10 text-blue-500" />,
          color: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
          title: "Submission Received",
          description: "Your submission is currently awaiting review. The review team will examine your annotations soon.",
        };
      case SubmissionStatus.UNDER_REVIEW:
        return {
          icon: <FileText className="h-10 w-10 text-purple-500" />,
          color: "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950",
          title: "Under Review",
          description: "Your submission is currently being reviewed. We'll provide feedback once the review is complete.",
        };
      case SubmissionStatus.REJECTED:
        return {
          icon: <AlertTriangle className="h-10 w-10 text-red-500" />,
          color: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
          title: "Changes Requested",
          description: `Some images need revision. Please address the feedback and resubmit when ready.`,
        };
      case SubmissionStatus.APPROVED:
        return {
          icon: <CheckCircle className="h-10 w-10 text-green-500" />,
          color: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
          title: "Submission Approved",
          description: "Congratulations! Your annotations have been approved.",
        };
      default:
        return {
          icon: <FileText className="h-10 w-10 text-gray-500" />,
          color: "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950",
          title: "Submission Status",
          description: "Submission details",
        };
    }
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Submissions
        </Button>
      </div>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Submission Details
            </h1>
            {getStatusBadge(submission.status)}
          </div>
          <p className="text-muted-foreground">
            {submission.imageCount} images submitted
            {submission.submittedAt &&
              ` on ${formatDate(submission.submittedAt)}`}
          </p>
        </div>
      </div>
      
      <Card className={cn("border-2", statusDetails.color)}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center justify-center rounded-full p-4 bg-white dark:bg-gray-800 shadow-sm">
              {statusDetails.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{statusDetails.title}</h2>
              <p className="text-muted-foreground mt-1">
                {statusDetails.description}
              </p>
              {submission.status === SubmissionStatus.REJECTED && (
                <div className="mt-4">
                  <Badge variant="destructive" className="mb-2">
                    {submission.flaggedImagesCount} {submission.flaggedImagesCount === 1 ? 'image' : 'images'} flagged
                  </Badge>
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Reviewer Feedback</AlertTitle>
                    <AlertDescription>
                      {submission.feedback || "No specific feedback provided. Please check the flagged images."}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              {submission.status === SubmissionStatus.APPROVED && submission.feedback && (
                <Alert className="mt-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle>Reviewer Feedback</AlertTitle>
                  <AlertDescription>
                    {submission.feedback}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
        {submission.status === SubmissionStatus.REJECTED && (
          <CardFooter className="bg-gray-50 dark:bg-gray-900 border-t p-4">
            <div className="w-full flex justify-end">
              <Button
                onClick={() => router.push(`/dashboard/projects/${projectId}?tab=images`)}
                variant="default"
              >
                View and Fix Flagged Images
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Submission Information</CardTitle>
          <CardDescription>Details of your submission and review process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Submission Date</h3>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(submission.submittedAt)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Image Count</h3>
              <p className="font-medium">{submission.imageCount} images</p>
              {submission.flaggedImagesCount > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {submission.flaggedImagesCount} images flagged for revision
                </p>
              )}
            </div>
            {submission.reviewedAt && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Review Date</h3>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(submission.reviewedAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(submission.reviewedAt), { addSuffix: true })}
                </p>
              </div>
            )}
            {submission.reviewedBy && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Reviewed By</h3>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{submission.reviewedBy.name}</span>
                </div>
              </div>
            )}
          </div>
          <Separator className="my-6" />
          {submission.message && (
            <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-900 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Your Message</h3>
              </div>
              <p className="text-sm whitespace-pre-line">&quot;{submission.message}&quot;</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <SubmissionTimeline submission={submission} projectId={projectId} />
    </div>
  );
}
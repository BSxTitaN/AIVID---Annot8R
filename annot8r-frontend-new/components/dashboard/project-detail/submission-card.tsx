import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileText, Flag, XCircle } from "lucide-react";
import { Submission, SubmissionStatus } from "@/lib/types";
import { formatDistanceToNow, format } from "date-fns";

interface SubmissionCardProps {
  submission: Submission;
  onClick: () => void;
}

export function SubmissionCard({ submission, onClick }: SubmissionCardProps) {
  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
          >
            <Clock className="h-3 w-3 mr-1" />
            Submitted
          </Badge>
        );
      case SubmissionStatus.UNDER_REVIEW:
        return (
          <Badge
            variant="outline"
            className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
          >
            <Clock className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        );
      case SubmissionStatus.REJECTED:
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case SubmissionStatus.APPROVED:
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
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
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-medium">
              Submission from{" "}
              {formatDistanceToNow(new Date(submission.submittedAt), {
                addSuffix: true,
              })}
            </h3>
            <p className="text-sm text-muted-foreground">
              {submission.imageCount} images •{" "}
              {formatDate(submission.submittedAt)}
            </p>
          </div>
          {getStatusBadge(submission.status)}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {submission.feedback ? (
          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-semibold mb-1">Feedback:</p>
            <p className="line-clamp-2">{submission.feedback}</p>
          </div>
        ) : (
          <div className="h-8 flex items-center text-muted-foreground text-sm">
            {submission.status === SubmissionStatus.SUBMITTED &&
              "Awaiting review..."}
            {submission.status === SubmissionStatus.UNDER_REVIEW &&
              "Currently being reviewed..."}
            {submission.status === SubmissionStatus.APPROVED &&
              "Approved without feedback"}
            {submission.status === SubmissionStatus.REJECTED &&
              "No feedback provided"}
          </div>
        )}
        {submission.flaggedImagesCount > 0 && (
          <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
            <Flag className="h-4 w-4 mr-1" />
            {submission.flaggedImagesCount} image
            {submission.flaggedImagesCount !== 1 ? "s" : ""} flagged for
            revision
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onClick}
        >
          <FileText className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  Flag,
  Image as ImageIcon,
  User,
  XCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Submission, SubmissionStatus } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface SubmissionTimelineProps {
  submission: Submission;
  projectId: string;
}

export function SubmissionTimeline({
  submission,
  projectId,
}: SubmissionTimelineProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("timeline");

  const handleViewImage = useCallback(
    (imageId: string) => {
      if (
        submission.status === SubmissionStatus.SUBMITTED ||
        submission.status === SubmissionStatus.UNDER_REVIEW
      ) {
        toast.info("Cannot edit images", {
          description:
            "This submission is currently under review. Images cannot be edited.",
          duration: 5000,
        });
        return;
      }

      router.push(
        `/editor/${projectId}/${imageId}?submissionId=${submission.id}&referrer=submissions`
      );
    },
    [router, submission, projectId]
  );

  const getStatusIcon = useCallback((status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return <Clock className="h-5 w-5 text-blue-500" />;
      case SubmissionStatus.UNDER_REVIEW:
        return <Clock className="h-5 w-5 text-purple-500" />;
      case SubmissionStatus.REJECTED:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case SubmissionStatus.APPROVED:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  }, []);

  const getStatusBadge = useCallback((status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Submitted
          </Badge>
        );
      case SubmissionStatus.UNDER_REVIEW:
        return (
          <Badge
            variant="outline"
            className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Under Review
          </Badge>
        );
      case SubmissionStatus.APPROVED:
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Approved
          </Badge>
        );
      case SubmissionStatus.REJECTED:
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }, []);

  // Function to get image-specific feedback from the submission
  const getImageFeedback = useCallback(
    (imageId: string): string | undefined => {
      // Look for feedback in imageFeedback array
      if (submission.imageFeedback && submission.imageFeedback.length > 0) {
        const feedbackEntry = submission.imageFeedback.find(
          (item) => item.imageId === imageId
        );
        if (feedbackEntry) {
          return feedbackEntry.feedback;
        }
      }
      
      // If no feedback found in imageFeedback, look in flaggedImages for backward compatibility
      if (submission.flaggedImages && submission.flaggedImages.length > 0) {
        const flaggedImage = submission.flaggedImages.find(
          (item) => item.imageId === imageId
        );
        if (flaggedImage) {
          return flaggedImage.reason;
        }
      }
      
      return undefined;
    },
    [submission]
  );

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "PPP 'at' p");
    } catch {
      return "Invalid date";
    }
  }, []);

  // Generate timeline events
  const timelineEvents = [];

  // Add submission event
  timelineEvents.push({
    id: "submission-created",
    date: submission.submittedAt,
    event: "Submission Created",
    status: SubmissionStatus.SUBMITTED,
    details: `Submitted ${submission.imageCount} images for review.`,
    user: submission.submittedBy,
  });

  // Add review history events
  if (submission.reviewHistory && submission.reviewHistory.length > 0) {
    submission.reviewHistory.forEach((review, index) => {
      timelineEvents.push({
        id: `review-${index}`,
        date: review.reviewedAt,
        event:
          review.status === SubmissionStatus.APPROVED
            ? "Submission Approved"
            : review.status === SubmissionStatus.REJECTED
            ? "Changes Requested"
            : "Submission Reviewed",
        status: review.status,
        details:
          review.feedback ||
          (review.status === SubmissionStatus.APPROVED
            ? "Approved without feedback."
            : "No feedback provided."),
        flaggedCount: review.flaggedImagesCount,
        user: { name: "Reviewer" },
      });
    });
  }

  // Add current review if not in history
  if (
    submission.reviewedAt &&
    (!submission.reviewHistory ||
      !submission.reviewHistory.some(
        (h) => h.reviewedAt === submission.reviewedAt
      ))
  ) {
    timelineEvents.push({
      id: "current-review",
      date: submission.reviewedAt,
      event:
        submission.status === SubmissionStatus.APPROVED
          ? "Submission Approved"
          : submission.status === SubmissionStatus.REJECTED
          ? "Changes Requested"
          : "Submission Reviewed",
      status: submission.status,
      details:
        submission.feedback ||
        (submission.status === SubmissionStatus.APPROVED
          ? "Approved without feedback."
          : "No feedback provided."),
      flaggedCount: submission.flaggedImagesCount,
      user: submission.reviewedBy,
    });
  }

  // Sort events chronologically
  timelineEvents.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Submission #{submission.id.slice(-6)}</CardTitle>
            <CardDescription>
              Created{" "}
              {formatDistanceToNow(new Date(submission.submittedAt), {
                addSuffix: true,
              })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(submission.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              <span>Images</span>
              {submission.flaggedImagesCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {submission.flaggedImagesCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-4 space-y-6">
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-medium mb-2">Submission Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Submitted By</p>
                  <p className="font-medium">
                    {submission.submittedBy?.name || "Unknown"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Submission Date</p>
                  <p className="font-medium">
                    {formatDate(submission.submittedAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Status</p>
                  <div>{getStatusBadge(submission.status)}</div>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Images</p>
                  <p className="font-medium">{submission.imageCount} total</p>
                </div>
              </div>
            </div>
            <div className="relative pl-6 border-l-2 border-muted space-y-6">
              {timelineEvents.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-[25px] mt-1 p-1 rounded-full bg-background border-2 border-muted">
                    {getStatusIcon(event.status)}
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{event.event}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(event.date), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="text-sm mt-2">
                      <p>{event.details}</p>
                      {event.flaggedCount && event.flaggedCount > 0 && (
                        <div className="mt-2 flex items-center text-red-600 dark:text-red-400">
                          <Flag className="h-4 w-4 mr-2" />
                          <span>
                            {event.flaggedCount} image
                            {event.flaggedCount !== 1 ? "s" : ""} flagged for
                            revision
                          </span>
                        </div>
                      )}
                    </div>
                    {event.user && (
                      <div className="flex items-center mt-3 pt-3 border-t text-sm text-muted-foreground">
                        <User className="h-4 w-4 mr-2" />
                        <span>{event.user.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="images" className="mt-4">
            {submission.flaggedImagesCount > 0 &&
              submission.flaggedImages &&
              submission.flaggedImages.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <Flag className="h-4 w-4 mr-2 text-red-500" />
                    <h3 className="font-semibold">Flagged Images</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {submission.flaggedImages.map((image) => (
                      <Card
                        key={image.imageId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleViewImage(image.imageId)}
                      >
                        <div className="aspect-video bg-muted relative flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                          <Badge
                            variant="destructive"
                            className="absolute top-2 right-2"
                          >
                            <Flag className="h-3 w-3 mr-1" />
                            Flagged
                          </Badge>
                        </div>
                        <CardContent className="p-3">
                          <h4 className="text-sm font-medium truncate">
                            {image.filename}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Reason: {image.reason}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            <div>
              <div className="flex items-center mb-3">
                <ImageIcon className="h-4 w-4 mr-2" />
                <h3 className="font-semibold">All Images</h3>
              </div>
              {submission.images && submission.images.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {submission.images.map((image) => (
                    <Card
                      key={image.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleViewImage(image.id)}
                    >
                      <div className="aspect-video bg-muted relative flex items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                        {image.reviewStatus === "FLAGGED" && (
                          <Badge
                            variant="destructive"
                            className="absolute top-2 right-2"
                          >
                            <Flag className="h-3 w-3 mr-1" />
                            Flagged
                          </Badge>
                        )}
                        {image.reviewStatus === "APPROVED" && (
                          <Badge className="absolute top-2 right-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h4 className="text-sm font-medium truncate">
                          {image.filename}
                        </h4>
                        {/* Use getImageFeedback instead of reviewFeedback */}
                        {getImageFeedback(image.id) && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            Feedback: {getImageFeedback(image.id)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No image details available
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
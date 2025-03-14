import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  ImageOff,
  Loader2,
  PenLine,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { loadImageForGrid } from "@/lib/api/projects";
import {
  AnnotationStatus,
  ReviewStatus,
  ProjectImage,
  ProjectStats,
  UserAssignment,
  SubmissionStatus,
} from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { getUserProjectImages, submitForReview } from "@/lib/api/user-projects";

interface ImagesTabProps {
  projectId: string;
  stats: ProjectStats | null;
  canSubmitForReview: boolean;
  onRefreshStats: () => void;
}

export function ImagesTab({
  projectId,
  stats,
  canSubmitForReview,
  onRefreshStats,
}: ImagesTabProps) {
  const router = useRouter();
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState("");
  
  // Image handling state
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getUserProjectImages(
        projectId,
        page,
        12,
        filter || undefined
      );
      if (response.success && response.data) {
        const filteredImages = searchQuery
          ? response.data.data.filter((img) =>
              img.filename.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : response.data.data;
        setImages(filteredImages);
        setTotalPages(response.data.totalPages);
      } else {
        setError(response.error || "Failed to load images");
        toast.error("Error loading images", {
          description: response.error || "Please try again later",
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      toast.error("Error", { description: "Failed to load images" });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, page, filter, searchQuery]);

  useEffect(() => {
    fetchImages();
  }, [page, filter, fetchImages]);

  // Effect to load image URLs for all images in the current page
  useEffect(() => {
    const loadImagesForCurrentPage = async () => {
      if (!images.length || isLoading) return;
      
      // Load images in batches of 5 to avoid too many simultaneous requests
      const batchSize = 5;
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        await Promise.all(
          batch.map((image) =>
            loadImageForGrid(projectId, image.id, setImageUrls, setFailedImages)
          )
        );
      }
    };
    
    loadImagesForCurrentPage();
  }, [images, projectId, isLoading]);

  const handleSearch = useCallback(() => {
    setPage(1);
    fetchImages();
  }, [setPage, fetchImages]);

  const handleImageClick = useCallback(
    (imageId: string) => {
      // Check if there's a pending submission
      const hasPendingSubmission = stats?.submissions?.some(
        s => s.status === SubmissionStatus.SUBMITTED || s.status === SubmissionStatus.UNDER_REVIEW
      );
      
      if (hasPendingSubmission) {
        // Prevent navigation and show a toast message
        toast.info("Cannot edit images", {
          description: "You have a submission under review. Images cannot be edited until the review is complete.",
          duration: 5000,
        });
        return;
      }
      
      // If no pending submission, proceed with navigation to editor
      router.push(`/editor/${projectId}/${imageId}`);
    },
    [projectId, router, stats]
  );

  const handleSubmitForReview = useCallback(async () => {
    if (!stats || !stats.assignments) {
      toast.error("Cannot submit for review", {
        description: "Assignment information is not available"
      });
      return;
    }
    const activeAssignment = stats.assignments.find(
      (a: UserAssignment) =>
        a.status === "ASSIGNED" || a.status === "IN_PROGRESS"
    );
    if (!activeAssignment) {
      toast.error("No active assignments found");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await submitForReview(
        projectId,
        activeAssignment.id,
        submissionNotes
      );
      if (response.success && response.data) {
        toast.success("Submission created successfully", {
          description: "Your annotations have been submitted for review.",
        });
        setShowSubmitDialog(false);
        setSubmissionNotes("");
        onRefreshStats();
        // Switch to submissions tab
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
  }, [projectId, stats, submissionNotes, onRefreshStats, router]);

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value === "all" ? null : value);
    setPage(1);
  }, []);

  const getStatusBadge = useCallback((image: ProjectImage) => {
    if (image.annotationStatus === AnnotationStatus.UNANNOTATED) {
      return (
        <Badge
          variant="outline"
          className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        >
          <Clock className="h-3 w-3 mr-1" />
          Not Started
        </Badge>
      );
    }
    if (image.annotationStatus === AnnotationStatus.IN_PROGRESS) {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
        >
          <PenLine className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      );
    }
    if (image.reviewStatus === ReviewStatus.FLAGGED) {
      return (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Flagged
        </Badge>
      );
    }
    if (image.reviewStatus === ReviewStatus.APPROVED) {
      return (
        <Badge
          variant="outline"
          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }
    if (image.annotationStatus === AnnotationStatus.COMPLETED) {
      return (
        <Badge
          variant="outline"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Annotated
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Unknown
      </Badge>
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Filter and search controls */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2">
          <Select
            value={filter === null ? "all" : filter}
            onValueChange={handleFilterChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Images</SelectItem>
              <SelectItem value="UNANNOTATED">Not Started</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Annotated</SelectItem>
              <SelectItem value="FLAGGED">Flagged</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchImages}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by filename..."
              className="pl-8 w-full sm:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button size="sm" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </div>

      {/* Submit for review alert */}
      {canSubmitForReview && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle>Ready for Review</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              You have annotated all assigned images and are ready to submit for
              review.
            </span>
            <Button
              onClick={() => setShowSubmitDialog(true)}
              className="mt-2 sm:mt-0"
            >
              Submit for Review
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Image grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square bg-muted animate-pulse" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : images.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <Card
                key={image.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleImageClick(image.id)}
              >
                <div className="aspect-square bg-muted relative">
                  {/* Image content - now with actual image loading */}
                  {imageUrls.has(image.id) ? (
                    <Image 
                      src={imageUrls.get(image.id) || ""}
                      alt={image.filename}
                      fill
                      className="object-cover"
                      onError={() => {
                        setFailedImages((prev) => {
                          const newSet = new Set(prev);
                          newSet.add(image.id);
                          return newSet;
                        });
                        setImageUrls((prev) => {
                          const newMap = new Map(prev);
                          newMap.delete(image.id);
                          return newMap;
                        });
                      }}
                    />
                  ) : failedImages.has(image.id) ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageOff className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(image)}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm truncate">
                    {image.filename}
                  </h3>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-muted-foreground">
                      {image.width}x{image.height}
                    </p>
                    {image.annotatedAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(image.annotatedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
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
        </>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No images found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {filter
              ? "Try changing your filter to see more images"
              : "No images have been assigned to you yet"}
          </p>
          {filter && (
            <Button variant="outline" onClick={() => handleFilterChange("all")}>
              Clear Filter
            </Button>
          )}
        </div>
      )}

      {/* Submit for review dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Annotations for Review</DialogTitle>
            <DialogDescription>
              Your annotations will be submitted for review. You won&apos;t be
              able to make further changes until the review is complete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Add notes for the reviewer (optional):
              </p>
              <Textarea
                placeholder="Add any notes or context for the reviewer..."
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitForReview} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>Submit for Review</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
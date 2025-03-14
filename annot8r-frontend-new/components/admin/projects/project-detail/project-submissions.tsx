import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  Flag,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  User,
  XCircle,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import {
  getSubmissions,
  getSubmission,
  reviewSubmission,
  getProxiedImageUrl,
} from "@/lib/api/projects";
import {
  Submission,
  SubmissionStatus,
  ReviewStatus,
  UserProfile,
} from "@/lib/types";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { getUsers } from "@/lib/api/users";

interface ProjectSubmissionsProps {
  projectId: string;
}

export function ProjectSubmissions({ projectId }: ProjectSubmissionsProps) {
  // Submission list state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // Detail view state
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [isViewingDetail, setIsViewingDetail] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [flaggedImages, setFlaggedImages] = useState<
    {
      imageId: string;
      reason: string;
    }[]
  >([]);
  const [imageFlagReason, setImageFlagReason] = useState<string>("");
  const [isFlaggingImage, setIsFlaggingImage] = useState(false);
  const [selectedImageForFlag, setSelectedImageForFlag] = useState<{
    id: string;
    filename: string;
  } | null>(null);

  // Users for filtering
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const router = useRouter();

  // Function to fetch submissions
  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status =
        statusFilter !== "all" ? (statusFilter as SubmissionStatus) : undefined;
      const response = await getSubmissions(
        projectId,
        page,
        10,
        status,
        userFilter
      );

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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error("Error loading submissions", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, page, statusFilter, userFilter]);

  // Function to fetch users for the filter
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const response = await getUsers(1, 100);
      if (response.success && response.data) {
        // Extract users from the nested structure
        if ("users" in response.data && Array.isArray(response.data.users)) {
          setUsers(response.data.users);
        }
        // Handle alternative data structures
        else if ("data" in response.data && Array.isArray(response.data.data)) {
          setUsers(response.data.data);
        }
        // Direct array response
        else if (Array.isArray(response.data)) {
          setUsers(response.data);
        }
        // Fallback to empty array if structure is unexpected
        else {
          console.warn("Unexpected users data structure:", response.data);
          setUsers([]);
        }
      } else {
        // Handle error or no data
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Function to view submission details
  const handleViewSubmission = useCallback(
    async (submissionId: string) => {
      setIsLoadingDetail(true);
      setIsViewingDetail(true);
      setSelectedSubmission(null);
      setActiveImageId(null);
      setImageUrls(new Map());
      setFlaggedImages([]);

      try {
        const response = await getSubmission(projectId, submissionId);
        if (response.success && response.data) {
          setSelectedSubmission(response.data);
          // Pre-populate flagged images if we're viewing a rejected submission
          if (
            response.data.flaggedImages &&
            response.data.status === SubmissionStatus.REJECTED
          ) {
            setFlaggedImages(
              response.data.flaggedImages.map((img) => ({
                imageId: img.imageId,
                reason: img.reason,
              }))
            );
          }
        } else {
          toast.error("Failed to load submission details", {
            description: response.error || "Please try again later",
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";
        toast.error("Error loading submission", { description: errorMessage });
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [projectId]
  );

  // Function to load image URL
  const loadImageUrl = useCallback(
    async (imageId: string) => {
      if (imageUrls.has(imageId)) return;

      try {
        const response = await getProxiedImageUrl(projectId, imageId);
        if (response.success && response.data && response.data.url) {
          // Store the URL in a local variable after validating it exists
          const imageUrl = response.data.url;
          setImageUrls((prev) => {
            const newMap = new Map(prev);
            newMap.set(imageId, imageUrl);
            return newMap;
          });
        }
      } catch (error) {
        console.error(`Error loading image ${imageId}:`, error);
      }
    },
    [projectId, imageUrls]
  );

  // Function to handle image click in detail view
  const handleImageClick = useCallback(
    (imageId: string) => {
      setActiveImageId(imageId);
      loadImageUrl(imageId);
    },
    [loadImageUrl]
  );

  // Function to open flag dialog
  const handleOpenFlagDialog = (image: { id: string; filename: string }) => {
    setSelectedImageForFlag(image);
    setIsFlaggingImage(true);
    setImageFlagReason("");
  };

  // Function to add flag to image
  const handleFlagImage = () => {
    if (!selectedImageForFlag || !imageFlagReason.trim()) return;

    const existingIndex = flaggedImages.findIndex(
      (img) => img.imageId === selectedImageForFlag.id
    );

    if (existingIndex >= 0) {
      // Update existing flag
      const newFlaggedImages = [...flaggedImages];
      newFlaggedImages[existingIndex].reason = imageFlagReason;
      setFlaggedImages(newFlaggedImages);
    } else {
      // Add new flag
      setFlaggedImages([
        ...flaggedImages,
        {
          imageId: selectedImageForFlag.id,
          reason: imageFlagReason,
        },
      ]);
    }

    // Close dialog and reset state
    setIsFlaggingImage(false);
    setSelectedImageForFlag(null);
    setImageFlagReason("");
  };

  // Function to remove flag from image
  const handleRemoveFlag = (imageId: string) => {
    setFlaggedImages(flaggedImages.filter((img) => img.imageId !== imageId));
  };

  // Function to handle review submission
  const handleReviewSubmission = async (status: SubmissionStatus) => {
    if (!selectedSubmission) return;

    // Validate overall feedback if rejecting
    if (
      status === SubmissionStatus.REJECTED &&
      !reviewFeedback.trim() &&
      flaggedImages.length === 0
    ) {
      toast.error("Feedback required", {
        description:
          "Please provide overall feedback for the rejected submission",
      });
      return;
    }

    // Cannot approve with flagged images
    if (status === SubmissionStatus.APPROVED && flaggedImages.length > 0) {
      toast.error("Cannot approve with flagged images", {
        description: "Please remove all flags or reject the submission",
      });
      return;
    }

    setIsReviewing(true);
    try {
      // Include both previously saved image feedback and any new flagged images
      const reviewData = {
        status,
        feedback: reviewFeedback.trim(),
        flaggedImages: flaggedImages,
        // Any previously saved imageFeedback will be preserved on the backend
      };

      const response = await reviewSubmission(
        projectId,
        selectedSubmission.id,
        reviewData
      );

      if (response.success) {
        toast.success(
          status === SubmissionStatus.APPROVED
            ? "Submission approved successfully"
            : "Submission rejected with feedback"
        );

        setIsViewingDetail(false);
        setSelectedSubmission(null);
        fetchSubmissions();
      } else {
        toast.error("Failed to submit review", {
          description: response.error || "Please try again",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error("Error reviewing submission", { description: errorMessage });
    } finally {
      setIsReviewing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Fetch users for filter
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Return to list view
  const handleBackToList = () => {
    setIsViewingDetail(false);
    setSelectedSubmission(null);
    setActiveImageId(null);
    setReviewFeedback("");
    setFlaggedImages([]);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "PPP p");
    } catch {
      return "Invalid date";
    }
  };

  // Get status badge
  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.SUBMITTED:
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Submitted
          </Badge>
        );
      case SubmissionStatus.UNDER_REVIEW:
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Under Review
          </Badge>
        );
      case SubmissionStatus.REJECTED:
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Rejected
          </Badge>
        );
      case SubmissionStatus.APPROVED:
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Approved
          </Badge>
        );
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  // Render list view
  if (!isViewingDetail) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="py-5 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Project Submissions</CardTitle>
              <CardDescription>
                Review and manage user submissions for this project
              </CardDescription>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value={SubmissionStatus.SUBMITTED}>
                      Submitted
                    </SelectItem>
                    <SelectItem value={SubmissionStatus.UNDER_REVIEW}>
                      Under Review
                    </SelectItem>
                    <SelectItem value={SubmissionStatus.REJECTED}>
                      Rejected
                    </SelectItem>
                    <SelectItem value={SubmissionStatus.APPROVED}>
                      Approved
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {!isLoadingUsers &&
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={fetchSubmissions}
                  variant="outline"
                  size="icon"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search submissions..."
                  className="pl-8 min-w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : error ? (
              <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No submissions found</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  There are no submissions matching your filters
                </p>
                {(statusFilter !== "all" || userFilter) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatusFilter("all");
                      setUserFilter(undefined);
                      setPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Submission ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Images</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-medium">
                            #{submission.id.slice(-6)}
                          </TableCell>
                          <TableCell>
                            {submission.submittedBy ? (
                              <div className="flex flex-col">
                                <span>{submission.submittedBy.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  @{submission.submittedBy.username}
                                </span>
                              </div>
                            ) : (
                              "Unknown User"
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(submission.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{submission.imageCount} total</span>
                              {submission.flaggedImagesCount > 0 && (
                                <span className="text-xs text-red-600 dark:text-red-400">
                                  {submission.flaggedImagesCount} flagged
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(
                              new Date(submission.submittedAt),
                              {
                                addSuffix: true,
                              }
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleViewSubmission(submission.id)
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            isActive={page > 1}
                            href="#"
                          />
                        </PaginationItem>

                        {[...Array(totalPages)].map((_, i) => (
                          <PaginationItem key={i}>
                            <PaginationLink
                              href="#"
                              onClick={() => setPage(i + 1)}
                              isActive={page === i + 1}
                            >
                              {i + 1}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setPage((p) => Math.min(totalPages, p + 1))
                            }
                            isActive={page < totalPages}
                            href="#"
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render detail view
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={handleBackToList}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Submissions
        </Button>
      </div>

      {isLoadingDetail ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !selectedSubmission ? (
        <Card>
          <CardHeader>
            <CardTitle>Submission Not Found</CardTitle>
            <CardDescription>
              The submission details could not be loaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackToList}>Return to List</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Submission Header */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>
                      Submission #{selectedSubmission.id.slice(-6)}
                    </CardTitle>
                    {getStatusBadge(selectedSubmission.status)}
                  </div>
                  <CardDescription>
                    Submitted by{" "}
                    {selectedSubmission.submittedBy?.name || "Unknown User"} on{" "}
                    {formatDate(selectedSubmission.submittedAt)}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedSubmission.status === SubmissionStatus.SUBMITTED && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const updatedSubmission = {
                            ...selectedSubmission,
                            status: SubmissionStatus.UNDER_REVIEW,
                          };
                          setSelectedSubmission(updatedSubmission);
                          handleReviewSubmission(SubmissionStatus.UNDER_REVIEW);
                        }}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Mark as Under Review
                      </Button>
                    </>
                  )}

                  {(selectedSubmission.status === SubmissionStatus.SUBMITTED ||
                    selectedSubmission.status ===
                      SubmissionStatus.UNDER_REVIEW) && (
                    <>
                      <Button
                        variant="destructive"
                        disabled={isReviewing}
                        onClick={() =>
                          handleReviewSubmission(SubmissionStatus.REJECTED)
                        }
                      >
                        {isReviewing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Reject
                      </Button>

                      <Button
                        variant="default"
                        disabled={isReviewing}
                        onClick={() =>
                          handleReviewSubmission(SubmissionStatus.APPROVED)
                        }
                      >
                        {isReviewing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Submission Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Images */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Images ({selectedSubmission.imageCount})
                  </CardTitle>
                  <CardDescription>
                    {flaggedImages.length > 0 ? (
                      <span className="text-red-600 dark:text-red-400">
                        {flaggedImages.length} image
                        {flaggedImages.length !== 1 ? "s" : ""} flagged for
                        revision
                      </span>
                    ) : (
                      <span>Click on an image to view it in detail</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedSubmission.images &&
                  selectedSubmission.images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedSubmission.images.map((image) => {
                        const isFlagged = flaggedImages.some(
                          (flagged) => flagged.imageId === image.id
                        );

                        const isApproved =
                          image.reviewStatus === ReviewStatus.APPROVED;

                        return (
                          <div
                            key={image.id}
                            className={cn(
                              "border rounded-lg overflow-hidden cursor-pointer transition-all",
                              isFlagged
                                ? "border-red-400 dark:border-red-500 shadow-sm"
                                : isApproved
                                ? "border-green-400 dark:border-green-500"
                                : "border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500",
                              activeImageId === image.id &&
                                "ring-2 ring-blue-500"
                            )}
                            onClick={() => handleImageClick(image.id)}
                          >
                            <div className="aspect-video bg-muted relative flex items-center justify-center">
                              {imageUrls.has(image.id) ? (
                                <Image
                                  src={imageUrls.get(image.id) || ""}
                                  alt={image.filename}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full w-full">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}

                              {isFlagged && (
                                <div className="absolute top-2 right-2">
                                  <Badge variant="destructive">
                                    <Flag className="h-3 w-3 mr-1" />
                                    Flagged
                                  </Badge>
                                </div>
                              )}

                              {isApproved && (
                                <div className="absolute top-2 right-2">
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approved
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-sm font-medium truncate">
                                {image.filename}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No images found in this submission
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Image Preview */}
              {activeImageId && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center">
                      <span>Image Preview</span>
                      <div className="flex gap-2">
                        {flaggedImages.some(
                          (img) => img.imageId === activeImageId
                        ) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFlag(activeImageId)}
                          >
                            <Flag className="h-4 w-4 mr-2 text-red-500" />
                            Remove Flag
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const selectedImage =
                                selectedSubmission.images?.find(
                                  (img) => img.id === activeImageId
                                );
                              if (selectedImage) {
                                handleOpenFlagDialog({
                                  id: selectedImage.id,
                                  filename: selectedImage.filename,
                                });
                              }
                            }}
                          >
                            <Flag className="h-4 w-4 mr-2" />
                            Flag Image
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            router.push(
                              `/editor/${projectId}/${activeImageId}?submissionId=${selectedSubmission.id}`
                            );
                          }}
                        >
                          Open in Editor
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {
                        selectedSubmission.images?.find(
                          (img) => img.id === activeImageId
                        )?.filename
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center items-center p-4 bg-muted/40 rounded-lg">
                      {imageUrls.has(activeImageId) ? (
                        <div className="relative max-h-[600px] w-full">
                          <Image
                            src={imageUrls.get(activeImageId) || ""}
                            alt="Preview"
                            width={800}
                            height={600}
                            className="object-contain max-h-[600px] w-auto mx-auto"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-12">
                          <RefreshCw className="h-8 w-8 animate-spin mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Loading image...
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Show flag reason if image is flagged */}
                    {flaggedImages.some(
                      (img) => img.imageId === activeImageId
                    ) && (
                      <Alert className="mt-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertTitle>Image Flagged</AlertTitle>
                        <AlertDescription>
                          Reason:{" "}
                          {
                            flaggedImages.find(
                              (img) => img.imageId === activeImageId
                            )?.reason
                          }
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Review Information */}
            <div className="space-y-6">
              {/* Submission Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Submission Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Submitted By
                    </h3>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">
                        {selectedSubmission.submittedBy?.name || "Unknown User"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Submission Date
                    </h3>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{formatDate(selectedSubmission.submittedAt)}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Status
                    </h3>
                    <div>{getStatusBadge(selectedSubmission.status)}</div>
                  </div>

                  {selectedSubmission.message && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        User Message
                      </h3>
                      <div className="bg-muted/30 p-3 rounded-md text-sm">
                        &quot;{selectedSubmission.message}&quot;
                      </div>
                    </div>
                  )}

                  {selectedSubmission.reviewedAt && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Reviewed Date
                      </h3>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{formatDate(selectedSubmission.reviewedAt)}</span>
                      </div>
                    </div>
                  )}

                  {selectedSubmission.feedback && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Feedback
                      </h3>
                      <div className="bg-muted/30 p-3 rounded-md text-sm">
                        &quot;{selectedSubmission.feedback}&quot;
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Review Form */}
              {(selectedSubmission.status === SubmissionStatus.SUBMITTED ||
                selectedSubmission.status ===
                  SubmissionStatus.UNDER_REVIEW) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Review Submission</CardTitle>
                    <CardDescription>
                      Provide feedback and approve or reject this submission
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Enter feedback for the user..."
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      className="min-h-32"
                    />

                    {flaggedImages.length > 0 && (
                      <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertTitle>Flagged Images</AlertTitle>
                        <AlertDescription>
                          {flaggedImages.length} image
                          {flaggedImages.length !== 1 ? "s" : ""} flagged. This
                          submission must be rejected.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="destructive"
                      disabled={isReviewing}
                      onClick={() =>
                        handleReviewSubmission(SubmissionStatus.REJECTED)
                      }
                    >
                      {isReviewing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject Submission
                    </Button>

                    <Button
                      variant="default"
                      disabled={isReviewing || flaggedImages.length > 0}
                      onClick={() =>
                        handleReviewSubmission(SubmissionStatus.APPROVED)
                      }
                    >
                      {isReviewing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve Submission
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* Flagged Images Summary */}
              {flaggedImages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Flagged Images</CardTitle>
                    <CardDescription>
                      {flaggedImages.length} image
                      {flaggedImages.length !== 1 ? "s" : ""} need revision
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {flaggedImages.map((flagged) => {
                        const image = selectedSubmission.images?.find(
                          (img) => img.id === flagged.imageId
                        );

                        return (
                          <div
                            key={flagged.imageId}
                            className="border border-red-200 dark:border-red-800 rounded-md p-3 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                            onClick={() => handleImageClick(flagged.imageId)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-center">
                                <Flag className="h-4 w-4 mr-2 text-red-500" />
                                <span className="font-medium">
                                  {image?.filename || "Unknown Image"}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFlag(flagged.imageId);
                                }}
                              >
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 ml-6">
                              {flagged.reason}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Flag Image Dialog */}
          <Dialog open={isFlaggingImage} onOpenChange={setIsFlaggingImage}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Flag Image</DialogTitle>
                <DialogDescription>
                  Provide reason why this image needs revision.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm font-medium mb-2">
                  Image: {selectedImageForFlag?.filename}
                </p>
                <Textarea
                  placeholder="Enter reason for flagging this image..."
                  value={imageFlagReason}
                  onChange={(e) => setImageFlagReason(e.target.value)}
                  className="min-h-24"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsFlaggingImage(false);
                    setSelectedImageForFlag(null);
                    setImageFlagReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleFlagImage}
                  disabled={!imageFlagReason.trim()}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Flag Image
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

export default ProjectSubmissions;

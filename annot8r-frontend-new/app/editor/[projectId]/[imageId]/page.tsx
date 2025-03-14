"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Editor } from "@/components/editor/Editor";
import { useAuth } from "@/lib/hooks/use-auth";
import { UserRole } from "@/lib/types";
import { getProjectImages, getSubmission } from "@/lib/api/projects";
import { toast } from "sonner";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [adjacentImages, setAdjacentImages] = useState<{
    prev: string | null;
    next: string | null;
    currentIndex: number;
    totalImages: number;
    imageIds: string[];
  }>({
    prev: null,
    next: null,
    currentIndex: 0,
    totalImages: 0,
    imageIds: [],
  });

  const projectId = params.projectId as string;
  const imageId = params.imageId as string;
  const submissionId = searchParams.get("submissionId");
  const referrer = searchParams.get("referrer") || "submissions"; // Default to submissions if not specified
  const statusFilter = searchParams.get("status");
  const isReview = !!submissionId;

  useEffect(() => {
    const fetchAdjacentImages = async () => {
      if (!user || !projectId || !imageId) return;

      try {
        const queryParams: Record<string, string> = {};
        if (statusFilter) {
          queryParams.status = statusFilter;
        }

        // Different handling for submission-based views vs regular image views
        if (isReview && submissionId) {
          // For submission views, get images from the submission
          try {
            const submissionResponse = await getSubmission(
              projectId,
              submissionId
            );
            
            if (submissionResponse.success && submissionResponse.data) {
              const submission = submissionResponse.data;
              
              // Extract image IDs from the submission's images
              if (submission.images && submission.images.length > 0) {
                const imageIds = submission.images.map((img) => img.id);
                const currentIndex = imageIds.indexOf(imageId);

                setAdjacentImages({
                  prev: currentIndex > 0 ? imageIds[currentIndex - 1] : null,
                  next:
                    currentIndex < imageIds.length - 1
                      ? imageIds[currentIndex + 1]
                      : null,
                  currentIndex: currentIndex !== -1 ? currentIndex : 0,
                  totalImages: imageIds.length,
                  imageIds,
                });
                setIsLoading(false);
                return;
              }
            } else {
              console.error("Failed to load submission:", submissionResponse.error);
              toast.error("Failed to load submission details", {
                description: submissionResponse.error || "Submission not found",
              });
            }

            // Fallback if submission doesn't have images array
            queryParams.submissionId = submissionId;
          } catch (err) {
            console.error("Error fetching submission images:", err);
            toast.error("Failed to load submission images", {
              description: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }

        if (user.role === UserRole.USER && !isReview) {
          // For regular user views (not reviewing submissions), only show assigned images
          queryParams.assignedTo = user.id;
        }

        // Get images using the project images API (either as fallback or primary method)
        const response = await getProjectImages(projectId, 1, 1000, queryParams);
        if (response.success && response.data && response.data.data) {
          const images = response.data.data;
          
          if (images.length === 0) {
            toast.error("No images found", {
              description: "There are no images available for this view",
            });
            setIsLoading(false);
            return;
          }
          
          const imageIds = images.map((img) => img.id);
          const currentIndex = imageIds.indexOf(imageId);

          if (currentIndex === -1) {
            toast.error("Image not found in the current set", {
              description: "The image you're trying to view is not in the current filtered set",
            });
          }

          setAdjacentImages({
            prev: currentIndex > 0 ? imageIds[currentIndex - 1] : null,
            next:
              currentIndex < imageIds.length - 1
                ? imageIds[currentIndex + 1]
                : null,
            currentIndex: currentIndex !== -1 ? currentIndex : 0,
            totalImages: imageIds.length,
            imageIds,
          });
        } else {
          console.error("Failed to load surrounding images:", response.error);
          toast.error("Failed to load image context", {
            description: response.error || "Could not find related images",
          });
        }
      } catch (err) {
        console.error("Error fetching adjacent images:", err);
        toast.error("Error loading images", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchAdjacentImages();
    }
  }, [
    projectId,
    imageId,
    submissionId,
    user,
    authLoading,
    statusFilter,
    isReview,
  ]);

  const handleBack = () => {
    if (!user) return;
  
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  
    if (isAdmin) {
      if (submissionId) {
        // Fixed admin navigation for submission reviews
        router.push(`/admin/projects/${projectId}/`);
      } else if (referrer === "images") {
        router.push(`/admin/projects/${projectId}?tab=images`);
      } else {
        router.push(`/admin/projects/${projectId}`);
      }
    } else {
      if (submissionId && referrer === "submissions") {
        // If coming from submissions tab, go back to submission details
        router.push(`/dashboard/projects/${projectId}?tab=submissions`);
      } else {
        router.push(
          `/dashboard/projects/${projectId}?tab=${referrer || "images"}`
        );
      }
    }
  };

  const handlePrevious = () => {
    if (adjacentImages.prev) {
      let url = `/editor/${projectId}/${adjacentImages.prev}`;
      const queryParams = [];

      if (submissionId) {
        queryParams.push(`submissionId=${submissionId}`);
      }

      if (referrer) {
        queryParams.push(`referrer=${referrer}`);
      }

      if (statusFilter) {
        queryParams.push(`status=${statusFilter}`);
      }

      if (queryParams.length > 0) {
        url += `?${queryParams.join("&")}`;
      }

      router.push(url);
    }
  };

  const handleNext = () => {
    if (adjacentImages.next) {
      let url = `/editor/${projectId}/${adjacentImages.next}`;
      const queryParams = [];

      if (submissionId) {
        queryParams.push(`submissionId=${submissionId}`);
      }

      if (referrer) {
        queryParams.push(`referrer=${referrer}`);
      }

      if (statusFilter) {
        queryParams.push(`status=${statusFilter}`);
      }

      if (queryParams.length > 0) {
        url += `?${queryParams.join("&")}`;
      }

      router.push(url);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
        return;
      }
      setIsLoading(false);
    }
  }, [user, authLoading, router]);

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isAdmin =
    user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const isOfficeUser = user.isOfficeUser || isAdmin;

  return (
    <Editor
      projectId={projectId}
      imageId={imageId}
      isAdmin={isAdmin}
      isOfficeUser={isOfficeUser}
      isReviewMode={isReview}
      submissionId={submissionId || undefined}
      onBack={handleBack}
      onNext={adjacentImages.next ? handleNext : undefined}
      onPrevious={adjacentImages.prev ? handlePrevious : undefined}
      hasPrevious={!!adjacentImages.prev}
      hasNext={!!adjacentImages.next}
      currentIndex={adjacentImages.currentIndex}
      totalImages={adjacentImages.totalImages}
    />
  );
}
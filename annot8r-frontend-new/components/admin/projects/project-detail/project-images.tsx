import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Upload,
  Image as ImageIcon,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  MoreVertical,
  EyeIcon,
  ImageOff,
  LayoutGrid,
  LayoutList,
  Share2,
  Users,
  ZapIcon,
  RotateCcw,
  PlusCircle,
  Minus,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Edit,
} from "lucide-react";
import {
  ImageStatus,
  ProjectImage,
  AnnotationStatus,
  ReviewStatus,
  ManualAssignmentRequest,
  UserProgressMetric,
  AssignmentMetrics,
  ProjectMemberForAssignment,
} from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import {
  deleteImage,
  getProjectImages,
  getProxiedImageUrl,
  createManualAssignment,
  createSmartDistribution,
  loadImageForGrid,
  getAssignmentMetrics,
  getProjectAssignmentMembers,
} from "@/lib/api/projects";
import { useRouter } from "next/navigation";

interface ProjectImagesProps {
  projectId: string;
}

export function ProjectImages({ projectId }: ProjectImagesProps) {
  const router = useRouter();
  // State for images
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<ProjectImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // State for upload
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // State for image preview
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ProjectImage | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");

  // State for assignment dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSmartDistributing, setIsSmartDistributing] = useState(false);
  const [assignmentMetrics, setAssignmentMetrics] =
    useState<AssignmentMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [resetDistribution, setResetDistribution] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<
    ProjectMemberForAssignment[]
  >([]);
  const [userAssignments, setUserAssignments] = useState<
    Array<{ userId: string; count: number }>
  >([]);

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Image handling state
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadingImageId, setLoadingImageId] = useState<string | null>(null);

  const [assignmentTab, setAssignmentTab] = useState<"manual" | "smart">(
    "manual"
  );

  const pageSize = 20;

  // Fetch images with filtering
  const fetchImages = useCallback(
    async (page = 1, filter: Record<string, string> = {}) => {
      setIsLoading(true);
      try {
        const query: Record<string, string> = { ...filter };
        if (statusFilter !== "all") {
          if (statusFilter === "unassigned") {
            query.assignedTo = "";
          } else if (statusFilter === "assigned") {
            query.status = "ASSIGNED";
          } else if (statusFilter === "annotated") {
            query.annotationStatus = "COMPLETED";
          } else if (statusFilter === "reviewed") {
            query.reviewStatus = "APPROVED,FLAGGED";
          }
        }
        const response = await getProjectImages(
          projectId,
          page,
          pageSize,
          query
        );
        if (response.success && response.data) {
          setImages(response.data.data);
          setFilteredImages(response.data.data);
          setTotalPages(response.data.totalPages);
        } else {
          toast.error("Failed to load images", {
            description: response.error || "An error occurred",
          });
        }
      } catch (error) {
        console.error("Error fetching images:", error);
        toast.error("Error loading images", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, statusFilter]
  );

  // Fetch assignment metrics (new function)
  const fetchAssignmentMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const response = await getAssignmentMetrics(projectId);
      if (response.success && response.data) {
        setAssignmentMetrics(response.data);
      } else {
        toast.error("Failed to load assignment metrics", {
          description: response.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error fetching assignment metrics:", error);
      toast.error("Error loading metrics", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [projectId]);

  // Fetch project members eligible for assignment (new function)
  const fetchProjectMembers = useCallback(async () => {
    try {
      const response = await getProjectAssignmentMembers(projectId);
      if (response.success && response.data && response.data.members) {
        setAvailableMembers(response.data.members);

        // Initialize user assignments with first member if available
        if (response.data.members.length > 0) {
          setUserAssignments([
            { userId: response.data.members[0].id, count: 0 },
          ]);
        } else {
          setUserAssignments([]);
        }
      } else {
        toast.error("Failed to load project members", {
          description: response.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error fetching project members:", error);
      toast.error("Error loading members", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [projectId]);

  // Initial data load
  useEffect(() => {
    fetchImages(currentPage);
  }, [projectId, currentPage, statusFilter, fetchImages]);

  // Load image URLs for visible items
  useEffect(() => {
    const loadImagesForCurrentPage = async () => {
      if (!filteredImages.length || isLoading) return;
      const batchSize = 5;
      for (let i = 0; i < filteredImages.length; i += batchSize) {
        const batch = filteredImages.slice(i, i + batchSize);
        await Promise.all(
          batch.map((image) =>
            loadImageForGrid(projectId, image.id, setImageUrls, setFailedImages)
          )
        );
      }
    };
    loadImagesForCurrentPage();
  }, [filteredImages, projectId, isLoading]);

  // Filter images based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredImages(images);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = images.filter((image) =>
      image.filename.toLowerCase().includes(query)
    );
    setFilteredImages(filtered);
  }, [searchQuery, images]);

  // Load assignment metrics when dialog opens
  useEffect(() => {
    if (isAssignDialogOpen) {
      fetchAssignmentMetrics();
      fetchProjectMembers();
    }
  }, [isAssignDialogOpen, fetchAssignmentMetrics, fetchProjectMembers]);

  // Calculate total assigned images in manual distribution
  const getTotalAssignmentCount = (): number => {
    return userAssignments.reduce(
      (total, assignment) => total + assignment.count,
      0
    );
  };

  // Calculate maximum assignable images
  const getMaxAssignableImages = (): number => {
    if (!assignmentMetrics) return 0;
    return (
      assignmentMetrics.unassignedImages +
      (resetDistribution ? assignmentMetrics.redistributableImages : 0)
    );
  };

  // Search form submission handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Pagination handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // File selection handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndSetFiles(files);
  };

  // File validation and setting
  const validateAndSetFiles = (files: File[]) => {
    if (files.length > 0) {
      const validFiles = files.filter((file) => {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds the 10MB file size limit`);
          return false;
        }
        return true;
      });
      setSelectedFiles((prevFiles) => [...prevFiles, ...validFiles]);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      validateAndSetFiles(files);
    }
  };

  // Upload handler with accurate progress tracking
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("No files selected for upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("file", file);
      });

      // Get token and API URL
      const token = localStorage.getItem("auth_token") || "";
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Set up progress tracking
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100
          );
          setUploadProgress(percentComplete);
        }
      });

      // Create a promise to handle the XHR request
      interface UploadResponse {
        success: boolean;
        data?: Array<{ id: string; name: string; [key: string]: unknown }>;
        error?: string;
      }

      const uploadPromise = new Promise<UploadResponse>((resolve, reject) => {
        xhr.open("POST", `${apiUrl}/projects/${projectId}/images/upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch {
              reject(new Error("Invalid JSON response"));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(
                new Error(
                  errorData.error ||
                    `Server returned ${xhr.status}: ${xhr.statusText}`
                )
              );
            } catch {
              reject(
                new Error(`Server returned ${xhr.status}: ${xhr.statusText}`)
              );
            }
          }
        };

        xhr.onerror = function () {
          reject(new Error("Network error occurred during upload"));
        };

        xhr.send(formData);
      });

      // Wait for upload to complete
      const response = await uploadPromise;

      // Ensure 100% progress at the end
      setUploadProgress(100);

      if (response.success && response.data) {
        toast.success("Images uploaded successfully", {
          description: `${response.data.length} images have been uploaded to the project`,
        });
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Close dialog and refresh images
        setTimeout(() => {
          setIsUploadDialogOpen(false);
          fetchImages(1);
          // Also refresh assignment metrics
          fetchAssignmentMetrics();
        }, 1000);
      } else {
        toast.error("Failed to upload images", {
          description: response.error || "An error occurred during upload",
        });
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images", {
        description:
          error instanceof Error
            ? error.message
            : "Unknown error occurred during upload",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Delete image handler
  const handleDeleteImage = async (imageId: string) => {
    try {
      const response = await deleteImage(projectId, imageId);
      if (response.success) {
        toast.success("Image deleted successfully");
        setImages((prevImages) =>
          prevImages.filter((img) => img.id !== imageId)
        );
        setFilteredImages((prevImages) =>
          prevImages.filter((img) => img.id !== imageId)
        );

        // Refresh assignment metrics
        fetchAssignmentMetrics();
      } else {
        toast.error("Failed to delete image", {
          description: response.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Error deleting image", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // View image handler
  const handleViewImage = async (image: ProjectImage) => {
    setSelectedImage(image);
    setSelectedImageUrl(""); // Reset image URL while loading
    setLoadingImageId(image.id);

    try {
      // Check if we already have the URL cached
      if (imageUrls.has(image.id)) {
        const imageUrl = imageUrls.get(image.id) || "";
        setSelectedImageUrl(imageUrl);
        setIsImagePreviewOpen(true);
        setLoadingImageId(null);
        return;
      }

      // Otherwise get the proxied image URL
      const response = await getProxiedImageUrl(projectId, image.id);
      if (response.success && response.data) {
        const imageUrl = response.data.url;

        // Cache the URL for future use
        setImageUrls((prev) => {
          const newMap = new Map(prev);
          newMap.set(image.id, imageUrl);
          return newMap;
        });

        setSelectedImageUrl(imageUrl);
        setIsImagePreviewOpen(true);
      } else {
        toast.error("Failed to load image", {
          description: response.error || "Unable to retrieve image URL",
        });
        setFailedImages((prev) => {
          const newSet = new Set(prev);
          newSet.add(image.id);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error loading image:", error);
      toast.error("Error loading image", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setFailedImages((prev) => {
        const newSet = new Set(prev);
        newSet.add(image.id);
        return newSet;
      });
    } finally {
      setLoadingImageId(null);
    }
  };

  // Open assignment dialog handler
  const handleOpenAssignDialog = () => {
    setIsAssignDialogOpen(true);
  };

  // Add assignment handler
  const handleAddAssignment = () => {
    if (availableMembers.length === 0) return;

    // Find a user that's not already in the assignments
    const assignedUserIds = new Set(userAssignments.map((a) => a.userId));
    const availableUser = availableMembers.find(
      (u) => !assignedUserIds.has(u.id)
    );

    if (availableUser) {
      setUserAssignments([
        ...userAssignments,
        { userId: availableUser.id, count: 0 },
      ]);
    } else {
      // All users already have assignments, duplicate the first one
      if (userAssignments.length > 0) {
        setUserAssignments([
          ...userAssignments,
          { ...userAssignments[0], count: 0 },
        ]);
      }
    }
  };

  // Remove assignment handler
  const handleRemoveAssignment = (index: number) => {
    const newAssignments = [...userAssignments];
    newAssignments.splice(index, 1);
    setUserAssignments(newAssignments);
  };

  // Change assignment handler
  const handleAssignmentChange = (
    index: number,
    field: "userId" | "count",
    value: string | number
  ) => {
    const newAssignments = [...userAssignments];
    newAssignments[index] = {
      ...newAssignments[index],
      [field]: value,
    };
    setUserAssignments(newAssignments);
  };

  // Adjust count handlers
  const incrementCount = (index: number) => {
    if (!assignmentMetrics) return;

    const newAssignments = [...userAssignments];
    const currentTotal = getTotalAssignmentCount();
    const maxAssignable = getMaxAssignableImages();

    if (currentTotal < maxAssignable) {
      newAssignments[index] = {
        ...newAssignments[index],
        count: newAssignments[index].count + 1,
      };
      setUserAssignments(newAssignments);
    } else {
      toast.error("Maximum assignable images reached");
    }
  };

  const decrementCount = (index: number) => {
    const newAssignments = [...userAssignments];
    if (newAssignments[index].count > 0) {
      newAssignments[index] = {
        ...newAssignments[index],
        count: newAssignments[index].count - 1,
      };
      setUserAssignments(newAssignments);
    }
  };

  // Manual assignment handler
  const handleManualAssign = async () => {
    if (userAssignments.length === 0) {
      toast.error("No assignments specified");
      return;
    }

    // Filter out assignments with zero count
    const nonZeroAssignments = userAssignments.filter((a) => a.count > 0);

    if (nonZeroAssignments.length === 0) {
      toast.error("No assignments with image count > 0");
      return;
    }

    const invalidAssignment = nonZeroAssignments.find(
      (a) => !a.userId || a.count <= 0
    );

    if (invalidAssignment) {
      toast.error("Invalid assignment", {
        description:
          "Each assignment must have a user and a positive image count",
      });
      return;
    }

    setIsAssigning(true);

    try {
      const data: ManualAssignmentRequest = {
        userAssignments: nonZeroAssignments,
        resetDistribution,
      };

      const response = await createManualAssignment(projectId, data);

      if (response.success) {
        toast.success("Images assigned successfully");
        setIsAssignDialogOpen(false);
        fetchImages(currentPage);

        // Reset the form for next time
        setResetDistribution(false);
        if (availableMembers.length > 0) {
          setUserAssignments([{ userId: availableMembers[0].id, count: 0 }]);
        } else {
          setUserAssignments([]);
        }
      } else {
        toast.error("Failed to assign images", {
          description: response.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error assigning images:", error);
      toast.error("Error assigning images", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Smart distribution handler
  const handleSmartDistribution = async () => {
    setIsSmartDistributing(true);

    try {
      const response = await createSmartDistribution(
        projectId,
        resetDistribution
      );

      if (response.success) {
        toast.success("Images distributed successfully", {
          description:
            "Images have been equally distributed among project annotators",
        });
        setIsAssignDialogOpen(false);
        fetchImages(currentPage);

        // Reset the form for next time
        setResetDistribution(false);
      } else {
        toast.error("Failed to distribute images", {
          description: response.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error distributing images:", error);
      toast.error("Error distributing images", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSmartDistributing(false);
    }
  };

  // Get status badge
  const getStatusBadge = (image: ProjectImage) => {
    if (image.reviewStatus === ReviewStatus.APPROVED) {
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        >
          Approved
        </Badge>
      );
    } else if (image.reviewStatus === ReviewStatus.FLAGGED) {
      return (
        <Badge
          variant="destructive"
          className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
        >
          Flagged
        </Badge>
      );
    } else if (image.reviewStatus === ReviewStatus.UNDER_REVIEW) {
      return (
        <Badge
          variant="outline"
          className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
        >
          Under Review
        </Badge>
      );
    } else if (image.annotationStatus === AnnotationStatus.COMPLETED) {
      return (
        <Badge
          variant="outline"
          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
        >
          Annotated
        </Badge>
      );
    } else if (image.status === ImageStatus.ASSIGNED) {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        >
          Assigned
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="outline"
          className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        >
          Unassigned
        </Badge>
      );
    }
  };

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleOpenInEditor = (image: ProjectImage) => {
    router.push(`/editor/${projectId}/${image.id}?referrer=images`);
  };

  // Component renderers
  const renderGridView = () => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredImages.map((image) => (
          <div
            key={image.id}
            className="group relative rounded-lg overflow-hidden border bg-card text-card-foreground shadow hover:border-primary transition-colors cursor-pointer"
            onClick={() => handleViewImage(image)}
          >
            <div className="aspect-square relative bg-muted">
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
                  <ImageOff className="h-12 w-12 text-destructive/50" />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  {loadingImageId === image.id ? (
                    <RefreshCw className="h-12 w-12 text-muted-foreground/50 animate-spin" />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                  )}
                </div>
              )}
              <div className="absolute inset-0 flex flex-col justify-between p-2">
                <div className="flex justify-end">{getStatusBadge(image)}</div>
                <div className="flex justify-between items-end">
                  <span className="text-xs bg-black/60 text-white px-2 py-1 rounded truncate max-w-[80%]">
                    {image.filename}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-black/60 text-white hover:bg-black/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuLabel>Image Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleViewImage(image)}>
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View Image
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleOpenInEditor(image)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Open in Editor
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                        onClick={() => handleDeleteImage(image.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Image
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">Filename</th>
                <th className="text-left py-3 px-4 font-medium">Dimensions</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium">Annotated</th>
                <th className="text-left py-3 px-4 font-medium">Uploaded</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredImages.map((image) => (
                <tr
                  key={image.id}
                  className="border-b bg-card hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleViewImage(image)}
                >
                  <td className="py-3 px-4 font-medium">{image.filename}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {image.width}×{image.height}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(image)}</td>
                  <td className="py-3 px-4">
                    {image.autoAnnotated ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800"
                      >
                        Auto
                      </Badge>
                    ) : image.annotationStatus ===
                      AnnotationStatus.COMPLETED ? (
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800"
                      >
                        Manual
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {formatDistanceToNow(new Date(image.uploadedAt), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuLabel>Image Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleViewImage(image)}
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          View Image
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenInEditor(image)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Open in Editor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                          onClick={() => handleDeleteImage(image.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Image
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderUserProgressCard = (user: UserProgressMetric) => {
    return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{user.fullName}</h3>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
          {user.isOfficeUser && (
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              Office User
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{user.progress}%</span>
          </div>
          <Progress value={user.progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>Time: {formatTime(user.timeSpent)}</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Annotated: {user.annotated}</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-amber-500" />
            <span>Pending: {user.unannotated}</span>
          </div>
          <div className="flex items-center gap-1">
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
            <span>~{user.averageTimePerImage}s per image</span>
          </div>
        </div>

        {user.lastActivity && (
          <div className="text-xs text-muted-foreground pt-1 border-t">
            Last active:{" "}
            {formatDistanceToNow(new Date(user.lastActivity), {
              addSuffix: true,
            })}
          </div>
        )}
      </div>
    );
  };

  const renderAssignmentForm = () => {
    const maxAssignable = getMaxAssignableImages();
    const currentAssigned = getTotalAssignmentCount();
    const remaining = maxAssignable - currentAssigned;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Manual Assignment</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddAssignment}
            disabled={userAssignments.length >= availableMembers.length}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {userAssignments.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground border rounded-md">
            No project members available for assignment
          </div>
        ) : (
          <>
            <div className="flex justify-between text-sm border-b pb-2">
              <span>Annotator</span>
              <span>Image Count ({remaining} remaining)</span>
            </div>

            {userAssignments.map((assignment, index) => (
              <div
                key={`assignment-${index}`}
                className="flex items-center gap-3"
              >
                <Select
                  value={assignment.userId}
                  onValueChange={(value) =>
                    handleAssignmentChange(index, "userId", value)
                  }
                >
                  <SelectTrigger className="flex-grow">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.fullName} ({member.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center border rounded-md">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 rounded-r-none"
                    onClick={() => decrementCount(index)}
                    disabled={assignment.count <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>

                  <Input
                    type="number"
                    min="0"
                    max={maxAssignable}
                    value={assignment.count}
                    onChange={(e) =>
                      handleAssignmentChange(
                        index,
                        "count",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-16 h-9 text-center border-0 border-x rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 rounded-l-none"
                    onClick={() => incrementCount(index)}
                    disabled={currentAssigned >= maxAssignable}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveAssignment(index)}
                  disabled={userAssignments.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="py-5 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Project Images</CardTitle>
            <CardDescription>
              Upload and manage project image files
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Dialog
              open={isUploadDialogOpen}
              onOpenChange={setIsUploadDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Images</DialogTitle>
                  <DialogDescription>
                    Upload images to this project for annotation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {!isUploading ? (
                    <div className="space-y-4">
                      <div
                        ref={dropZoneRef}
                        className={`border-2 border-dashed rounded-lg p-6 text-center ${
                          isDragging
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25"
                        }`}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                        >
                          <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          <span className="font-medium">
                            Drag images here or click to select
                          </span>
                          <span className="text-xs text-muted-foreground">
                            JPG, PNG, or GIF up to 10MB
                          </span>
                        </label>
                      </div>
                      {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            Selected Files: {selectedFiles.length}
                          </p>
                          <div className="max-h-60 overflow-y-auto text-sm border rounded-md">
                            {selectedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between px-3 py-2 border-b last:border-0"
                              >
                                <span className="truncate max-w-[300px]">
                                  {file.name}
                                </span>
                                <span>{Math.round(file.size / 1024)} KB</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col items-center justify-center gap-2 py-6">
                        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                        <span className="font-medium">Uploading images...</span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(uploadProgress)}% complete
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  {!isUploading ? (
                    <>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button
                        onClick={handleUpload}
                        disabled={selectedFiles.length === 0}
                      >
                        Upload{" "}
                        {selectedFiles.length > 0
                          ? `(${selectedFiles.length})`
                          : ""}
                      </Button>
                    </>
                  ) : (
                    <Button disabled>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isAssignDialogOpen}
              onOpenChange={setIsAssignDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handleOpenAssignDialog}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Assign Images
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px] max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Assign Images</DialogTitle>
                  <DialogDescription>
                    Distribute images to annotators for this project
                  </DialogDescription>
                </DialogHeader>

                <div
                  className="overflow-y-auto pr-1"
                  style={{ maxHeight: "calc(90vh - 200px)" }}
                >
                  {isLoadingMetrics ? (
                    <div className="py-8 flex justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : assignmentMetrics ? (
                    <>
                      {/* Distribution Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-muted/30 rounded-lg p-3 text-center">
                          <h3 className="text-sm font-medium text-muted-foreground">
                            Total Images
                          </h3>
                          <p className="text-2xl font-bold">
                            {assignmentMetrics.totalImages}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 text-center">
                          <h3 className="text-sm font-medium text-muted-foreground">
                            Unassigned
                          </h3>
                          <p className="text-2xl font-bold">
                            {assignmentMetrics.unassignedImages}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 text-center">
                          <h3 className="text-sm font-medium text-muted-foreground">
                            Redistributable
                          </h3>
                          <p className="text-2xl font-bold">
                            {assignmentMetrics.redistributableImages}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 text-center">
                          <h3 className="text-sm font-medium text-muted-foreground">
                            Annotated
                          </h3>
                          <p className="text-2xl font-bold">
                            {assignmentMetrics.annotatedImages}
                          </p>
                        </div>
                      </div>

                      {/* Reset Distribution Option */}
                      <div className="flex items-center space-x-2 py-2 mb-4 border-y">
                        <Switch
                          id="reset-distribution"
                          checked={resetDistribution}
                          onCheckedChange={setResetDistribution}
                        />
                        <Label
                          htmlFor="reset-distribution"
                          className="flex gap-2 items-center"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reset distribution
                          <span className="text-xs text-muted-foreground">
                            (Allows reassigning images that are already assigned
                            but not annotated)
                          </span>
                        </Label>
                      </div>

                      {/* User Progress */}
                      {assignmentMetrics.userProgress.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-sm font-medium mb-3">
                            Annotator Progress
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {assignmentMetrics.userProgress.map((user) => (
                              <div
                                key={user.userId}
                                className="border rounded-lg p-1"
                              >
                                {renderUserProgressCard(user)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Tabs
                        defaultValue="manual"
                        value={assignmentTab}
                        onValueChange={(value) =>
                          setAssignmentTab(value as "manual" | "smart")
                        }
                        className="mt-6"
                      >
                        <TabsList className="grid grid-cols-2 mb-4">
                          <TabsTrigger
                            value="manual"
                            className="flex items-center gap-2"
                          >
                            <Users className="h-4 w-4" />
                            <span>Manual Assignment</span>
                          </TabsTrigger>
                          <TabsTrigger
                            value="smart"
                            className="flex items-center gap-2"
                          >
                            <ZapIcon className="h-4 w-4" />
                            <span>Smart Distribution</span>
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="manual" className="space-y-4">
                          {renderAssignmentForm()}
                          <div className="text-sm bg-muted p-3 rounded-md">
                            <span className="font-medium">
                              Available for assignment:
                            </span>{" "}
                            {getMaxAssignableImages()} images
                            {resetDistribution && (
                              <span className="text-muted-foreground ml-2">
                                (including{" "}
                                {assignmentMetrics.redistributableImages}{" "}
                                redistributable images)
                              </span>
                            )}
                          </div>
                          {getTotalAssignmentCount() >
                            getMaxAssignableImages() && (
                            <div className="text-destructive text-sm">
                              Error: Assignment total (
                              {getTotalAssignmentCount()} images) exceeds
                              available images ({getMaxAssignableImages()})
                            </div>
                          )}
                        </TabsContent>
                        <TabsContent value="smart" className="space-y-4">
                          <div className="bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 p-4 rounded-md">
                            <h3 className="font-semibold flex items-center gap-2">
                              <ZapIcon className="h-4 w-4" />
                              Smart Distribution
                            </h3>
                            <p className="text-sm mt-1">
                              This will automatically distribute{" "}
                              {getMaxAssignableImages()} available images
                              equally among all project annotators. The system
                              ensures each annotator receives a fair share of
                              images to work on.
                            </p>
                          </div>
                          <div className="border rounded-md p-3 text-sm">
                            <p className="font-medium">How it works:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                              <li>
                                The system counts all available images in the
                                project
                                {resetDistribution &&
                                  " (including redistributable images)"}
                              </li>
                              <li>
                                Finds all users with annotator role in the
                                project
                              </li>
                              <li>
                                Calculates equal distribution (with potential
                                remainder)
                              </li>
                              <li>
                                Distributes images fairly among all annotators
                              </li>
                              <li>
                                Already annotated images remain with their
                                current assignees
                              </li>
                            </ul>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      Unable to load assignment metrics
                    </div>
                  )}
                </div>

                <DialogFooter className="border-t pt-4 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAssignDialogOpen(false)}
                    disabled={isAssigning || isSmartDistributing}
                  >
                    Cancel
                  </Button>
                  {assignmentMetrics && (
                    <>
                      {assignmentTab === "manual" ? (
                        <Button
                          onClick={handleManualAssign}
                          disabled={
                            isAssigning ||
                            userAssignments.length === 0 ||
                            getTotalAssignmentCount() === 0 ||
                            getTotalAssignmentCount() > getMaxAssignableImages()
                          }
                        >
                          {isAssigning ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Assigning...
                            </>
                          ) : (
                            <>
                              <Share2 className="h-4 w-4 mr-2" />
                              Apply Assignment
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSmartDistribution}
                          disabled={
                            isSmartDistributing ||
                            getMaxAssignableImages() === 0
                          }
                        >
                          {isSmartDistributing ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Distributing...
                            </>
                          ) : (
                            <>
                              <ZapIcon className="h-4 w-4 mr-2" />
                              Apply Distribution
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search filenames..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[240px]"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="icon"
                className="shrink-0"
              >
                <Filter className="h-4 w-4" />
                <span className="sr-only">Filter</span>
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
                <TabsTrigger value="assigned">Assigned</TabsTrigger>
                <TabsTrigger value="annotated">Annotated</TabsTrigger>
                <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {isLoading ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                  : "space-y-2"
              }
            >
              {[...Array(viewMode === "grid" ? 10 : 5)].map((_, i) => (
                <Skeleton
                  key={i}
                  className={
                    viewMode === "grid" ? "aspect-square w-full" : "h-12 w-full"
                  }
                />
              ))}
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <ImageOff className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No images found</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {images.length === 0
                  ? "This project doesn't have any images yet. Upload images to get started."
                  : "No images matching your search or filter criteria."}
              </p>
              {images.length === 0 && (
                <Button
                  onClick={() => setIsUploadDialogOpen(true)}
                  className="mt-4"
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
              )}
            </div>
          ) : (
            <>
              {viewMode === "grid" ? renderGridView() : renderListView()}

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedImage?.filename}</DialogTitle>
            <DialogDescription>
              {selectedImage && (
                <>
                  {selectedImage.width}×{selectedImage.height} pixels
                  {selectedImage.assignedTo && " • Currently assigned"}
                  {selectedImage.annotationStatus ===
                    AnnotationStatus.COMPLETED && " • Annotated"}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center p-2 bg-black/5 dark:bg-white/5 rounded-md">
            {selectedImageUrl ? (
              <Image
                src={selectedImageUrl}
                alt={selectedImage?.filename || "Preview"}
                width={800}
                height={600}
                className="max-h-[60vh] w-auto object-contain"
                onError={() => {
                  toast.error("Failed to load image", {
                    description: "The image could not be displayed",
                  });
                  if (selectedImage) {
                    setFailedImages((prev) => {
                      const newSet = new Set(prev);
                      newSet.add(selectedImage.id);
                      return newSet;
                    });
                    setImageUrls((prev) => {
                      const newMap = new Map(prev);
                      newMap.delete(selectedImage.id);
                      return newMap;
                    });
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
                <p className="text-muted-foreground">Loading image...</p>
              </div>
            )}
          </div>
          {selectedImage && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Status</p>
                <div className="mt-1">{getStatusBadge(selectedImage)}</div>
              </div>
              <div>
                <p className="font-medium">Uploaded</p>
                <p className="mt-1 text-muted-foreground">
                  {formatDistanceToNow(new Date(selectedImage.uploadedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              {selectedImage.assignedTo && (
                <div>
                  <p className="font-medium">Assigned To</p>
                  <p className="mt-1 text-muted-foreground">
                    User ID: {selectedImage.assignedTo.toString()}
                  </p>
                </div>
              )}
              {selectedImage.annotatedBy && (
                <div>
                  <p className="font-medium">Annotated By</p>
                  <p className="mt-1 text-muted-foreground">
                    User ID: {selectedImage.annotatedBy.toString()}
                    {selectedImage.autoAnnotated && " (Auto-annotated)"}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImagePreviewOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

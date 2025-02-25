// components/project-details/ProjectImages.tsx
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ImageIcon,
  MoreVertical,
  Search,
  Upload,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Project } from "@/lib/types/project";
import { UploadImagesDialog } from "./UploadImagesDialog";
import { Annotation } from "@/lib/types/annotations";
import { useRouter } from "next/navigation";
import { usePageData } from "@/lib/context/page-data-context";
import { toast } from "sonner";
import { deleteProjectImage } from "@/lib/apis/images";

interface ProjectImage {
  id: string;
  metadata: {
    originalName: string;
    lastModified: Date;
  };
  status:
    | "pending"
    | "in_progress"
    | "completed"
    | "review_pending"
    | "changes_requested";
  assignedTo: string;
  annotations: Annotation[];
}

interface ExtendedProject extends Project {
  images?: ProjectImage[];
}

interface ProjectImagesProps {
  project: ExtendedProject;
}

export function ProjectImages({ project }: ProjectImagesProps) {
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const { setEditorData } = usePageData();

  const statusColors: Record<ProjectImage["status"], string> = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    review_pending: "bg-purple-100 text-purple-800",
    changes_requested: "bg-red-100 text-red-800",
  };

  const handleReviewImages = () => {
    // Get all image IDs
    const imageIds = project.images?.map((image) => image.id) || [];

    if (imageIds.length === 0) {
      toast.error("No images available to review");
      return;
    }

    // Find the user for these images - typically get from the first image
    const userId =
      project.images?.[0]?.assignedTo || project.members[0]?.userId;

    if (!userId) {
      toast.error("No user found for these images");
      return;
    }

    // Set editor data with all images
    setEditorData({
      imageIds: imageIds,
      userId: userId,
      projectId: project.id,
      clickedImageId: imageIds[0],
    });

    // Navigate to the review page
    router.push(`/admin/projects/${project.id}/review`);
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await deleteProjectImage(project.id, imageId);
      toast.success("Image deleted successfully");
      // Refresh the images list
      router.refresh();
    } catch {
      toast.error("Failed to delete image");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Project Images</h3>
          <p className="text-sm text-muted-foreground">
            Manage and monitor image annotations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Images
          </Button>
          <Button variant="outline" onClick={handleReviewImages}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Review Annotations
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search images..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Images</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="review_pending">Review Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Annotations</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {project.images?.map((image: ProjectImage) => (
              <TableRow key={image.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <span className="font-medium">
                      {image.metadata.originalName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{image.assignedTo || "Unassigned"}</TableCell>
                <TableCell>
                  <Badge className={statusColors[image.status]}>
                    {image.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(image.metadata.lastModified), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>{image.annotations?.length || 0}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDeleteImage(image.id)}
                        className="text-red-600"
                      >
                        Delete Image
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UploadImagesDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        projectId={project.id}
      />
    </div>
  );
}
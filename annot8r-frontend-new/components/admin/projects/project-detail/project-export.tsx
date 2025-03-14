// components/admin/projects/project-detail/project-export.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Project, ExportStatus } from "@/lib/types";
import {
  createExport,
  getExportStatus,
  getExportDownload,
} from "@/lib/api/projects";

interface ProjectExportProps {
  project: Project;
}

export function ProjectExport({ project }: ProjectExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [includeImages, setIncludeImages] = useState(true);
  const [onlyReviewed, setOnlyReviewed] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // First, create the export
      const response = await createExport(project.id, {
        format: "YOLO", // Currently only YOLO format is supported
        includesImages: includeImages,
        onlyReviewedAnnotations: onlyReviewed,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to create export");
      }

      const exportData = response.data;

      // If the export is already completed, download it directly
      if (exportData.status === ExportStatus.COMPLETED && exportData.url) {
        window.location.href = exportData.url;
        setIsDialogOpen(false);
        setIsExporting(false);
        return;
      }

      // Otherwise, poll the export status until it's completed
      const checkExportStatus = async () => {
        const statusResponse = await getExportStatus(project.id, exportData.id);

        if (!statusResponse.success || !statusResponse.data) {
          throw new Error(
            statusResponse.error || "Failed to check export status"
          );
        }

        const exportStatus = statusResponse.data.status;

        if (exportStatus === ExportStatus.FAILED) {
          throw new Error("Export failed");
        }

        if (exportStatus === ExportStatus.COMPLETED) {
          // Get the download URL
          const downloadResponse = await getExportDownload(
            project.id,
            exportData.id
          );

          if (!downloadResponse.success || !downloadResponse.data) {
            throw new Error(
              downloadResponse.error || "Failed to get download URL"
            );
          }

          // Initiate download
          window.location.href = downloadResponse.data.url;
          setIsDialogOpen(false);
          setIsExporting(false);
          return;
        }

        // If still processing, check again after a delay
        setTimeout(checkExportStatus, 2000);
      };

      // Start polling
      checkExportStatus();
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs sm:text-sm">
          <Download className="h-4 w-4 mr-1 sm:mr-2" />
          <span>Export Project</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
          <DialogDescription>
            Download the project data in YOLO format
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="include-images"
              checked={includeImages}
              onCheckedChange={(checked) =>
                setIncludeImages(checked as boolean)
              }
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="include-images">Include images</Label>
              <p className="text-sm text-muted-foreground">
                Export will include original images along with annotations
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="only-reviewed"
              checked={onlyReviewed}
              onCheckedChange={(checked) => setOnlyReviewed(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="only-reviewed">
                Only export reviewed annotations
              </Label>
              <p className="text-sm text-muted-foreground">
                Only include annotations that have been reviewed and approved
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isExporting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

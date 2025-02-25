// components/project-details/UploadImagesDialog.tsx
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  X,
  FileImage,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadProjectImages } from "@/lib/apis/images";
import { useRouter } from "next/navigation";

interface UploadImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface UploadFile {
  file: File;
  preview?: string;
  progress: number;
  error?: string;
  status: "pending" | "uploading" | "completed" | "error";
  dimensions?: {
    width: number;
    height: number;
  };
  size: number;
}

const BATCH_SIZE = 5;
const MAX_PREVIEW_SIZE = 100;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadImagesDialog({
  open,
  onOpenChange,
  projectId,
}: UploadImagesDialogProps) {
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorFiles, setErrorFiles] = useState<string[]>([]);

  const getImageDimensions = (
    file: File
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const validFiles = Array.from(selectedFiles).filter(
        (file) => file.type.startsWith("image/") && file.size <= MAX_FILE_SIZE
      );

      if (validFiles.length === 0) {
        toast.error("No valid images selected");
        return;
      }

      const newFiles: UploadFile[] = await Promise.all(
        validFiles.map(async (file) => {
          const dimensions = await getImageDimensions(file);
          return {
            file,
            preview:
              files.length < MAX_PREVIEW_SIZE
                ? URL.createObjectURL(file)
                : undefined,
            progress: 0,
            status: "pending",
            dimensions,
            size: file.size,
          };
        })
      );

      setFiles((prev) => [...prev, ...newFiles]);

      if (validFiles.length > 1000) {
        toast.warning(
          `Large upload queued (${validFiles.length.toLocaleString()} files)`,
          { description: "Files will be uploaded in batches" }
        );
      }
    },
    [files.length]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const uploadBatch = async (
    batch: UploadFile[],
    startIndex: number
  ): Promise<boolean> => {
    try {
      await uploadProjectImages(
        "",
        projectId,
        batch.map((f) => f.file)
      );

      setFiles((prev) =>
        prev.map((file, index) => {
          if (index >= startIndex && index < startIndex + batch.length) {
            return { ...file, status: "completed", progress: 100 };
          }
          return file;
        })
      );

      return true;
    } catch (error) {
      setFiles((prev) =>
        prev.map((file, index) => {
          if (index >= startIndex && index < startIndex + batch.length) {
            return {
              ...file,
              status: "error",
              error: error instanceof Error ? error.message : "Upload failed",
            };
          }
          return file;
        })
      );

      setErrorFiles((prev) => [...prev, ...batch.map((f) => f.file.name)]);

      return false;
    }
  };

  const uploadFiles = async (): Promise<void> => {
    if (files.length === 0) {
      toast.error("No files selected");
      return;
    }

    setIsUploading(true);
    setErrorFiles([]);
    let failedBatches = 0;

    try {
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const success = await uploadBatch(batch, i);

        if (!success) {
          failedBatches++;
        }

        const progress = Math.round(((i + BATCH_SIZE) / files.length) * 100);
        setOverallProgress(Math.min(progress, 100));
      }

      const successCount = files.length - failedBatches * BATCH_SIZE;

      if (successCount === files.length) {
        toast.success(
          `Successfully uploaded ${files.length.toLocaleString()} images`
        );
        handleDialogClose(false);
        router.refresh();
      } else {
        toast.warning(`Upload partially completed`, {
          description: `${successCount.toLocaleString()} of ${files.length.toLocaleString()} files uploaded successfully`,
        });
      }
    } catch (error) {
      toast.error("Upload failed", {
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during upload",
      });
    } finally {
      setIsUploading(false);
      setOverallProgress(0);
    }
  };

  const handleDialogClose = (open: boolean): void => {
    if (!open) {
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      setFiles([]);
      setOverallProgress(0);
      setErrorFiles([]);
    }
    onOpenChange(open);
  };

  const renderStats = () => {
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const pendingFiles = files.filter((f) => f.status === "pending").length;
    const completedFiles = files.filter((f) => f.status === "completed").length;

    return (
      <div className="text-sm space-y-2 p-4 bg-muted rounded-lg">
        <div className="flex justify-between">
          <span>Total Files:</span>
          <span>{files.length.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Size:</span>
          <span>{formatFileSize(totalSize)}</span>
        </div>
        <div className="flex justify-between">
          <span>Pending:</span>
          <span>{pendingFiles.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Completed:</span>
          <span>{completedFiles.toLocaleString()}</span>
        </div>
        {errorFiles.length > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Failed:</span>
            <span>{errorFiles.length.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
    <DialogContent className="flex h-[85vh] sm:h-auto sm:max-h-[85vh] flex-col p-0 gap-0 max-w-[90vw] sm:max-w-[700px]">
      {/* Fixed Header */}
      <div className="flex-none px-6 py-4 border-b bg-white">
        <DialogHeader>
          <DialogTitle>Upload Images</DialogTitle>
          <DialogDescription>
            Upload images for annotation. Supports JPG, PNG formats up to{" "}
            {formatFileSize(MAX_FILE_SIZE)} each.
          </DialogDescription>
        </DialogHeader>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 space-y-6">
          {/* Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8",
              "hover:border-primary/50 transition-colors duration-200",
              "cursor-pointer bg-muted/50"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(e.dataTransfer.files);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/jpeg,image/png"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: JPG, PNG (max {formatFileSize(MAX_FILE_SIZE)})
              </p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-4">
              {/* Stats Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStats(!showStats)}
                className="text-sm w-full justify-between"
              >
                <span>Upload Statistics</span>
                {showStats ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {/* Stats Panel */}
              {showStats && renderStats()}

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <Progress value={overallProgress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    Uploading... {overallProgress}%
                  </p>
                </div>
              )}

              {/* File List */}
              <ScrollArea className="h-[300px] w-full border rounded-md">
                <div className="p-4 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={`${file.file.name}-${index}`}
                      className={cn(
                        "flex items-center gap-4 p-3 border rounded-lg",
                        file.status === "completed" &&
                          "bg-green-50 border-green-200",
                        file.status === "error" && "bg-red-50 border-red-200"
                      )}
                    >
                      {/* File Preview/Icon */}
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.file.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <FileImage className="h-10 w-10 text-blue-500" />
                      )}

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                          {file.dimensions &&
                            ` • ${file.dimensions.width}×${file.dimensions.height}`}
                        </p>
                        {file.error && (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {file.error}
                          </p>
                        )}
                      </div>

                      {/* Delete Button */}
                      {!isUploading && file.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (file.preview) {
                              URL.revokeObjectURL(file.preview);
                            }
                            setFiles(files.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="flex-none px-6 py-4 border-t bg-gray-50/90 backdrop-blur-sm">
        <DialogFooter className="sm:justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => handleDialogClose(false)}
            disabled={isUploading}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={uploadFiles}
            disabled={files.length === 0 || isUploading}
            className="sm:flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading {files.length.toLocaleString()} files...
              </>
            ) : (
              <>
                Upload {files.length.toLocaleString()} file
                {files.length !== 1 && "s"}
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
  );
}

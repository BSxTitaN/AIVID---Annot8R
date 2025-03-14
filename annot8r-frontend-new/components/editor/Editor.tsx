import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { PhotoViewer } from "./PhotoViewer";
import {
  getProject,
  getProxiedImageUrl,
  getAnnotation,
  saveAnnotation,
  autoSaveAnnotation,
  getProjectClasses,
  autoAnnotate,
  updateImageFeedback,
  getSubmission,
} from "@/lib/api/projects";
import { ProjectClass } from "@/lib/types";
import { AutosaveStatus } from "./AutoSaveIndicator";

// Define types for annotation objects
interface AnnotationObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
}

interface EditorProps {
  projectId: string;
  imageId: string;
  isAdmin?: boolean;
  isOfficeUser?: boolean;
  isReviewMode?: boolean;
  submissionId?: string;
  onBack: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalImages?: number;
}

interface YoloObjectFromBackend {
  x: number;
  y: number;
  width: number;
  height: number;
  className: string;
  classId: string;
}

// Using AutosaveStatus type from AutoSaveIndicator component

export function Editor({
  projectId,
  imageId,
  isAdmin = false,
  isOfficeUser = false,
  isReviewMode = false,
  submissionId,
  onBack,
  onNext,
  onPrevious,
  hasPrevious = false,
  hasNext = false,
  currentIndex = 0,
  totalImages = 0,
}: EditorProps) {
  // Core state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [classes, setClasses] = useState<ProjectClass[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>("not_available");
  const [error, setError] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageFeedback, setImageFeedback] = useState<string | undefined>(
    undefined
  );

  // Refs for tracking state
  const lastSavedAnnotationsRef = useRef<string>("[]");
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoSavingRef = useRef<boolean>(false);
  const saveRetryCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const isInitialLoadCompletedRef = useRef<boolean>(false);
  const currentAnnotationsDigestRef = useRef<string>("[]");

  // Constants
  const MAX_RETRY_COUNT = 3;
  const MIN_ANNOTATION_SIZE = 20;

  // Track time spent on annotation
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(timer);
      isMountedRef.current = false;
    };
  }, []);

  // Utilities for annotation conversion
  const convertYoloToScreen = useCallback(
    (
      yoloObject: YoloObjectFromBackend,
      imgWidth: number,
      imgHeight: number,
      index: number
    ): AnnotationObject => {
      const centerX = yoloObject.x;
      const centerY = yoloObject.y;
      const width = yoloObject.width;
      const height = yoloObject.height;
      const stableId = `${imageId}-${yoloObject.classId}-${index}-${Math.round(
        centerX * 10000
      )}-${Math.round(centerY * 10000)}`;

      return {
        id: stableId,
        x: (centerX - width / 2) * imgWidth,
        y: (centerY - height / 2) * imgHeight,
        width: width * imgWidth,
        height: height * imgHeight,
        class: yoloObject.className,
      };
    },
    [imageId]
  );

  const normalizeCoordinates = useCallback(
    (annotation: AnnotationObject): AnnotationObject => {
      if (imageSize.width === 0 || imageSize.height === 0) return annotation;

      return {
        ...annotation,
        x: annotation.x / imageSize.width,
        y: annotation.y / imageSize.height,
        width: annotation.width / imageSize.width,
        height: annotation.height / imageSize.height,
      };
    },
    [imageSize.width, imageSize.height]
  );

  // Load annotations from server
  const loadAnnotations = useCallback(
    async (imgWidth: number, imgHeight: number, forceRefresh = false) => {
      if (!isMountedRef.current) return;

      try {
        setSaveStatus((prevStatus) =>
          prevStatus === "error" ? "not_available" : prevStatus
        );

        const annotationsResponse = await getAnnotation(projectId, imageId);

        console.log(annotationsResponse)

        if (!isMountedRef.current) return;

        if (annotationsResponse.success && annotationsResponse.data) {
          const objects = annotationsResponse.data.objects || [];

          if (Array.isArray(objects) && objects.length > 0) {
            const convertedAnnotations = objects.map((obj, index) =>
              convertYoloToScreen(obj, imgWidth, imgHeight, index)
            );

            const annotationsDigest = JSON.stringify(convertedAnnotations);
            currentAnnotationsDigestRef.current = annotationsDigest;

            // Only update state if there are actual changes or if forced
            if (
              forceRefresh ||
              annotationsDigest !== lastSavedAnnotationsRef.current
            ) {
              setAnnotations(convertedAnnotations);
              lastSavedAnnotationsRef.current = annotationsDigest;
            }

            setSaveStatus("saved");
          } else {
            setAnnotations([]);
            lastSavedAnnotationsRef.current = "[]";
            currentAnnotationsDigestRef.current = "[]";
            setSaveStatus("not_available");
          }
        } else {
          setAnnotations([]);
          lastSavedAnnotationsRef.current = "[]";
          currentAnnotationsDigestRef.current = "[]";
          setSaveStatus("not_available");
        }
      } catch (err) {
        if (!isMountedRef.current) return;

        console.error("Error loading annotations:", err);
        toast.error("Failed to load annotations", {
          description: err instanceof Error ? err.message : "Unknown error",
        });

        setAnnotations([]);
        lastSavedAnnotationsRef.current = "[]";
        currentAnnotationsDigestRef.current = "[]";
        setSaveStatus("not_available");
      }
    },
    [projectId, imageId, convertYoloToScreen]
  );

  // Auto-save annotations
  const performAutoSave = useCallback(async () => {
    if (isAutoSavingRef.current || !isMountedRef.current) return;

    const currentAnnotationsStr = JSON.stringify(annotations);
    currentAnnotationsDigestRef.current = currentAnnotationsStr;

    // Skip if nothing changed or some annotations don't have classes assigned
    if (
      currentAnnotationsStr === lastSavedAnnotationsRef.current ||
      annotations.some((ann) => !ann.class)
    ) {
      return;
    }

    isAutoSavingRef.current = true;
    setSaveStatus("saving");

    try {
      const normalizedAnnotations = annotations.map(normalizeCoordinates);
      const yoloObjects = normalizedAnnotations.map((ann) => {
        const classObj = classes.find((c) => c.name === ann.class);
        const classId = classObj ? classObj.id : "";

        // Convert from top-left to center coordinates for YOLO format
        return {
          x: ann.x + ann.width / 2,
          y: ann.y + ann.height / 2,
          width: ann.width,
          height: ann.height,
          classId: classId,
          className: ann.class,
        };
      });

      const response = await autoSaveAnnotation(projectId, imageId, {
        objects: yoloObjects.map((obj) => ({
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
        })),
        classIds: yoloObjects.map((obj) => obj.classId),
        classNames: yoloObjects.map((obj) => obj.className),
        timeSpent: timeSpent,
      });

      if (!isMountedRef.current) return;

      if (response.success) {
        // Update the last saved state only if this is still the current state
        if (currentAnnotationsStr === currentAnnotationsDigestRef.current) {
          lastSavedAnnotationsRef.current = currentAnnotationsStr;
          setSaveStatus("saved");
          saveRetryCountRef.current = 0;
        } else {
          // If annotations changed during save, mark as unsaved to trigger another save
          setSaveStatus("unsaved");
        }
      } else {
        throw new Error(response.error || "Auto-save failed");
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("Auto-save failed:", err);

      // Increment retry count and handle failures
      saveRetryCountRef.current += 1;

      if (saveRetryCountRef.current <= MAX_RETRY_COUNT) {
        setSaveStatus("unsaved"); // Will trigger another save attempt
        console.log(
          `Auto-save retry ${saveRetryCountRef.current}/${MAX_RETRY_COUNT}`
        );
      } else {
        setSaveStatus("error");
        toast.error("Failed to save annotations after multiple attempts", {
          description: "Please try manual save or refresh the page",
        });
        saveRetryCountRef.current = 0;
      }
    } finally {
      if (isMountedRef.current) {
        isAutoSavingRef.current = false;
      }
    }
  }, [
    annotations,
    classes,
    normalizeCoordinates,
    projectId,
    imageId,
    timeSpent,
  ]);

  // Handle annotation changes with immediate auto-save
  useEffect(() => {
    if (!isInitialLoadCompletedRef.current) return;

    const currentAnnotationsStr = JSON.stringify(annotations);
    currentAnnotationsDigestRef.current = currentAnnotationsStr;

    if (currentAnnotationsStr !== lastSavedAnnotationsRef.current) {
      setSaveStatus("unsaved");
      // Call performAutoSave immediately instead of using a timeout
      performAutoSave();
    }

    // Return a cleanup function
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [annotations, performAutoSave]);

  // Initial data loading
  useEffect(() => {
    const fetchData = async () => {
      if (!isMountedRef.current) return;

      setIsLoading(true);
      setError(null);
      isInitialLoadCompletedRef.current = false;

      try {
        // Load project data for classes
        const projectResponse = isAdmin
          ? await getProject(projectId)
          : await getProjectClasses(projectId);

        if (!isMountedRef.current) return;

        if (!projectResponse.success || !projectResponse.data) {
          throw new Error(
            projectResponse.error || "Failed to load project details"
          );
        }

        if (isAdmin && projectResponse.data.classes) {
          setClasses(projectResponse.data.classes);
        } else if (!isAdmin && projectResponse.data.classes) {
          setClasses(projectResponse.data.classes);
        } else {
          console.warn("No class information found in project response");
          setClasses([]);
        }

        // If we're in review mode, fetch submission data to get image feedback
        if (isReviewMode && submissionId) {
          const submissionResponse = await getSubmission(
            projectId,
            submissionId
          );

          if (submissionResponse.success && submissionResponse.data) {
            const submission = submissionResponse.data;

            // Look for feedback for this specific image
            let feedback: string | undefined;

            // First check in imageFeedback array (new format)
            if (
              submission.imageFeedback &&
              submission.imageFeedback.length > 0
            ) {
              const feedbackEntry = submission.imageFeedback.find(
                (item) => item.imageId === imageId
              );
              if (feedbackEntry) {
                feedback = feedbackEntry.feedback;
              }
            }

            // If no feedback found in imageFeedback, check in flaggedImages (old format)
            if (
              !feedback &&
              submission.flaggedImages &&
              submission.flaggedImages.length > 0
            ) {
              const flaggedImage = submission.flaggedImages.find(
                (item) => item.imageId === imageId
              );
              if (flaggedImage) {
                feedback = flaggedImage.reason;
              }
            }

            if (feedback) {
              setImageFeedback(feedback);
            }
          }
        }

        // Load image URL
        const imageUrlResponse = await getProxiedImageUrl(projectId, imageId);

        if (!isMountedRef.current) return;

        if (!imageUrlResponse.success || !imageUrlResponse.data) {
          throw new Error(imageUrlResponse.error || "Failed to load image");
        }

        setImageUrl(imageUrlResponse.data.url);

        // Load image dimensions
        const img = new Image();

        img.onload = async () => {
          if (!isMountedRef.current) return;

          const width = img.naturalWidth;
          const height = img.naturalHeight;

          setImageSize({ width, height });
          await loadAnnotations(width, height);
          isInitialLoadCompletedRef.current = true;
          setIsLoading(false);
        };

        img.onerror = (e) => {
          if (!isMountedRef.current) return;

          console.error("Image failed to load", e);
          toast.error("Failed to load image");
          setIsLoading(false);
        };

        img.src = imageUrlResponse.data.url;
      } catch (err) {
        if (!isMountedRef.current) return;

        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        toast.error("Error loading editor", { description: errorMessage });
        setIsLoading(false);
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    projectId,
    imageId,
    isAdmin,
    loadAnnotations,
    isReviewMode,
    submissionId,
  ]);

  // Handle annotations changes
  const handleAnnotationsChange = useCallback(
    (newAnnotations: AnnotationObject[]) => {
      setAnnotations(newAnnotations);
    },
    []
  );

  // Manual save handler
  const handleSave = useCallback(async (): Promise<boolean> => {
    // Check if all annotations have classes assigned
    const hasUnassignedClasses = annotations.some((ann) => !ann.class);
    if (hasUnassignedClasses) {
      toast.error("Please assign classes to all annotations before saving");
      return false;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const normalizedAnnotations = annotations.map(normalizeCoordinates);
      const yoloObjects = normalizedAnnotations.map((ann) => {
        const classObj = classes.find((c) => c.name === ann.class);
        const classId = classObj ? classObj.id : "";

        return {
          x: ann.x + ann.width / 2,
          y: ann.y + ann.height / 2,
          width: ann.width,
          height: ann.height,
          classId: classId,
          className: ann.class,
        };
      });

      const saveResponse = await saveAnnotation(projectId, imageId, {
        objects: yoloObjects.map((obj) => ({
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
        })),
        classIds: yoloObjects.map((obj) => obj.classId),
        classNames: yoloObjects.map((obj) => obj.className),
        timeSpent: timeSpent,
        autoAnnotated: false,
      });

      if (!saveResponse.success) {
        throw new Error(saveResponse.error || "Failed to save annotations");
      }

      // After save, fetch the latest annotations to ensure consistency
      await loadAnnotations(imageSize.width, imageSize.height, true);

      lastSavedAnnotationsRef.current = JSON.stringify(annotations);
      setSaveStatus("saved");
      saveRetryCountRef.current = 0;

      toast.success("Annotations saved successfully");
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save annotations";
      toast.error("Error saving annotations", { description: errorMessage });
      setSaveStatus("error");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    annotations,
    normalizeCoordinates,
    projectId,
    imageId,
    timeSpent,
    classes,
    loadAnnotations,
    imageSize.width,
    imageSize.height,
  ]);

  // Auto-annotation handler
  const handleAutoAnnotate = useCallback(async (): Promise<void> => {
    if (!isOfficeUser) {
      toast.error("Auto-annotation is not available");
      return;
    }
  
    setIsSaving(true);
  
    try {
      // Call the backend API without sending any data - the backend will generate random boxes
      const response = await autoAnnotate(projectId, imageId);
  
      if (response.success && response.data) {
        const objects = response.data.objects || [];
        const convertedAnnotations = objects.map((obj, index) => {
          const topLeftX = (obj.x - obj.width / 2) * imageSize.width;
          const topLeftY = (obj.y - obj.height / 2) * imageSize.height;
  
          return {
            id: `auto-${imageId}-${obj.classId}-${index}-${Math.round(
              obj.x * 10000
            )}-${Math.round(obj.y * 10000)}`,
            x: topLeftX,
            y: topLeftY,
            width: obj.width * imageSize.width,
            height: obj.height * imageSize.height,
            class: obj.className,
          };
        });
  
        setAnnotations(convertedAnnotations);
  
        const annotationsDigest = JSON.stringify(convertedAnnotations);
        lastSavedAnnotationsRef.current = annotationsDigest;
        currentAnnotationsDigestRef.current = annotationsDigest;
  
        setSaveStatus("saved");
        toast.success("Auto-annotation applied successfully");
      } else {
        throw new Error(response.error || "Auto-annotation failed");
      }
    } catch (error) {
      toast.error("Auto-annotation failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [isOfficeUser, projectId, imageId, imageSize.width, imageSize.height, setSaveStatus, setAnnotations]);

  // Handle requesting changes in review mode
  const handleRequestChanges = useCallback(
    async (feedback: string) => {
      if (!isAdmin || !isReviewMode || !submissionId) {
        return;
      }

      try {
        // First ensure annotations are saved
        const currentAnnotationsStr = JSON.stringify(annotations);
        if (currentAnnotationsStr !== lastSavedAnnotationsRef.current) {
          await handleSave();
        }

        // Store the feedback for this specific image without changing submission status
        const response = await updateImageFeedback(
          projectId,
          submissionId,
          imageId,
          feedback
        );

        if (response.success) {
          toast.success("Image feedback saved", {
            description: `Feedback for this image has been saved. Continue reviewing other images.`,
          });

          // Navigate to the next image if available, otherwise stay on this one
          if (hasNext && onNext) {
            onNext();
          }
        } else {
          throw new Error(response.error || "Failed to save image feedback");
        }
      } catch (error) {
        toast.error("Failed to save image feedback", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [
      isAdmin,
      isReviewMode,
      submissionId,
      annotations,
      lastSavedAnnotationsRef,
      handleSave,
      imageId,
      projectId,
      hasNext,
      onNext,
    ]
  );

  // Image size change handler
  const handleImageSizeChange = useCallback((width: number, height: number) => {
    setImageSize({ width, height });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-xl font-bold text-destructive">
          Error loading editor
        </div>
        <div className="text-muted-foreground">{error}</div>
        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={onBack}
        >
          Go Back
        </button>
      </div>
    );
  }

  // No image state
  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-xl font-bold">Image Not Available</div>
        <div className="text-muted-foreground">
          The requested image could not be loaded
        </div>
        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={onBack}
        >
          Go Back
        </button>
      </div>
    );
  }

  // Render the photo viewer with the current state
  return (
    <div className="w-full h-screen overflow-hidden">
      <PhotoViewer
        currentImageId={imageId}
        annotations={annotations}
        availableClasses={classes}
        isOfficeUser={isOfficeUser}
        imageUrl={imageUrl}
        onSave={handleSave}
        onAnnotationsChange={handleAnnotationsChange}
        onAutoAnnotate={isOfficeUser ? handleAutoAnnotate : undefined}
        onNext={onNext}
        onPrevious={onPrevious}
        onBack={onBack}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        currentIndex={currentIndex}
        totalImages={totalImages}
        isAdmin={isAdmin}
        isReviewMode={isReviewMode}
        onRequestChanges={
          isAdmin && isReviewMode ? handleRequestChanges : undefined
        }
        saveStatus={saveStatus}
        setSaveStatus={setSaveStatus}
        isSaving={isSaving}
        onImageLoad={handleImageSizeChange}
        minAnnotationSize={MIN_ANNOTATION_SIZE}
        imageFeedback={imageFeedback}
      />
    </div>
  );
}
import React, { useState, useEffect, useRef, useCallback } from "react";
import NextImage from "next/image";
import { ArrowLeft, Clipboard, Redo, Trash, Undo } from "lucide-react";
import { toast } from "sonner";
import AutosaveIndicator, { AutosaveStatus } from "./AutoSaveIndicator";
import AnnotationToolbar from "./AnnotationToolbar";
import ImageMover from "./ImageMover";
import Annotation from "./Annotation";
import { NavigationControls } from "./PaginationTool";
import { StatusInfo } from "./StatusInfo";
import { HelpDialog } from "./HelpDialog";
import AnnotationListPanel from "./LabelSidebar";
import {
  Point,
  ResizeHandle,
  isCornerHandle,
  isSideHandle,
} from "@/lib/types/editor";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProjectClass } from "@/lib/types";

// Use the AutosaveStatus type from the AutoSaveIndicator component

interface AnnotationObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
}

// Updated PhotoViewer props interface
interface PhotoViewerProps {
  currentImageId: string;
  annotations: AnnotationObject[];
  availableClasses: ProjectClass[];
  isOfficeUser: boolean;
  isAdmin?: boolean;
  isReviewMode?: boolean;
  imageUrl: string;
  onSave: () => Promise<boolean>;
  onAnnotationsChange: (annotations: AnnotationObject[]) => void;
  onAutoAnnotate?: () => Promise<void>;
  onRequestChanges?: (feedback: string) => Promise<void>;
  onNext?: () => void;
  onPrevious?: () => void;
  onBack: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalImages: number;
  saveStatus: AutosaveStatus;
  setSaveStatus: (status: AutosaveStatus) => void;
  isSaving: boolean;
  onImageLoad?: (width: number, height: number) => void;
  minAnnotationSize?: number;
  imageFeedback?: string; // Added this property
}

export function PhotoViewer({
  currentImageId,
  annotations,
  availableClasses,
  isOfficeUser,
  isAdmin = false,
  isReviewMode = false,
  imageUrl,
  onSave,
  onAnnotationsChange,
  onAutoAnnotate,
  onRequestChanges,
  onNext,
  onPrevious,
  onBack,
  hasPrevious,
  hasNext,
  currentIndex,
  totalImages,
  saveStatus,
  setSaveStatus,
  isSaving,
  onImageLoad,
  minAnnotationSize = 20,
  imageFeedback,
}: PhotoViewerProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // State for image view
  const [imageState, setImageState] = useState<{
    width: number;
    height: number;
    scale: number;
    position: Point;
  }>({
    width: 0,
    height: 0,
    scale: 0.5,
    position: { x: 0, y: 0 },
  });

  // State for annotations
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<AnnotationObject | null>(null);
  const [currentAnnotation, setCurrentAnnotation] =
    useState<AnnotationObject | null>(null);

  // State for drag operations
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    isDraggingAnnotation: boolean;
    dragStart: Point;
    dragOffset: Point;
    resizingSide: ResizeHandle;
  }>({
    isDragging: false,
    isDraggingAnnotation: false,
    dragStart: { x: 0, y: 0 },
    dragOffset: { x: 0, y: 0 },
    resizingSide: null,
  });

  // State for editor mode
  const [editorState, setEditorState] = useState<{
    isLocked: boolean;
    isDrawing: boolean;
  }>({
    isLocked: false,
    isDrawing: false,
  });

  // State for edit history
  const [history, setHistory] = useState<{
    annotations: AnnotationObject[][];
    currentIndex: number;
  }>({
    annotations: [annotations],
    currentIndex: 0,
  });

  // State for review dialog
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Refs for smooth operation
  const userActedRef = useRef<boolean>(false);
  const preventNextHistoryUpdateRef = useRef<boolean>(false);

  // Update history when parent annotations change
  useEffect(() => {
    // Only update history if the annotations have changed externally (like loading from backend)
    // and not due to user interaction that we've already handled
    const currentAnnotationsJson = JSON.stringify(annotations);
    const lastHistoryJson =
      history.annotations.length > 0
        ? JSON.stringify(history.annotations[history.currentIndex])
        : "";

    if (
      currentAnnotationsJson !== lastHistoryJson &&
      !preventNextHistoryUpdateRef.current
    ) {
      setHistory({
        annotations: [annotations],
        currentIndex: 0,
      });
    }

    // Reset the prevention flag
    preventNextHistoryUpdateRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations]); // Depend only on annotations, not history

  // Clear selection when image changes
  useEffect(() => {
    setSelectedAnnotation(null);
  }, [currentImageId]);

  // Update drag state
  const updateDragState = useCallback(
    (updates: Partial<typeof dragState>): void => {
      setDragState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Update editor state
  const updateEditorState = useCallback(
    (
      updates:
        | Partial<typeof editorState>
        | ((prev: typeof editorState) => typeof editorState)
    ): void => {
      if (typeof updates === "function") {
        setEditorState(updates);
      } else {
        setEditorState((prev) => ({ ...prev, ...updates }));
      }
    },
    []
  );

  // Update image state
  const updateImageState = useCallback(
    (
      updates:
        | Partial<typeof imageState>
        | ((prev: typeof imageState) => typeof imageState)
    ): void => {
      if (typeof updates === "function") {
        setImageState(updates);
      } else {
        setImageState((prev) => ({ ...prev, ...updates }));
      }
    },
    []
  );

  // Update annotations and history
  const updateAnnotations = useCallback(
    (newAnnotations: AnnotationObject[], addToHistory = true): void => {
      userActedRef.current = true;
      preventNextHistoryUpdateRef.current = true;

      onAnnotationsChange(newAnnotations);

      if (addToHistory) {
        setHistory((prev) => ({
          annotations: [
            ...prev.annotations.slice(0, prev.currentIndex + 1),
            newAnnotations,
          ],
          currentIndex: prev.currentIndex + 1,
        }));
      }

      setSaveStatus("unsaved");
    },
    [onAnnotationsChange, setSaveStatus]
  );

  // Center the image in the viewport
  const centerImage = useCallback((): void => {
    if (!containerRef.current || !imageRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const imgWidth = imageRef.current.naturalWidth;
    const imgHeight = imageRef.current.naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = imgWidth / imgHeight;

    let scale = 0.5;
    if (containerAspect > imageAspect) {
      scale = (containerRect.height * 0.8) / imgHeight;
    } else {
      scale = (containerRect.width * 0.8) / imgWidth;
    }

    scale = Math.min(Math.max(scale, 0.1), 1);

    updateImageState({
      width: imgWidth,
      height: imgHeight,
      scale: scale,
      position: {
        x: (containerRect.width - imgWidth * scale) / 2,
        y: (containerRect.height - imgHeight * scale) / 2,
      },
    });
  }, [updateImageState]);

  // Handle zoom operations
  const handleZoom = useCallback(
    (delta: number): void => {
      if (!containerRef.current) return;

      const { width, height } = containerRef.current.getBoundingClientRect();
      const mouseX = width / 2;
      const mouseY = height / 2;

      updateImageState((prev) => {
        const newScale = Math.max(0.1, Math.min(prev.scale * delta, 2));
        const scaleFactor = newScale / prev.scale;

        return {
          ...prev,
          scale: newScale,
          position: {
            x: prev.position.x - (mouseX - prev.position.x) * (scaleFactor - 1),
            y: prev.position.y - (mouseY - prev.position.y) * (scaleFactor - 1),
          },
        };
      });
    },
    [updateImageState]
  );

  // Reset the view
  const handleReset = useCallback((): void => {
    if (!containerRef.current || !imageRef.current) return;
    centerImage();
  }, [centerImage]);

  // Get mouse position relative to the image
  const getMousePosition = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };

      return {
        x: (e.clientX - rect.left - imageState.position.x) / imageState.scale,
        y: (e.clientY - rect.top - imageState.position.y) / imageState.scale,
      };
    },
    [imageState.position.x, imageState.position.y, imageState.scale]
  );

  // Normalize annotation coordinates (ensure width/height are positive)
  const normalizeAnnotation = useCallback(
    (ann: AnnotationObject): AnnotationObject => {
      const normalized = { ...ann };

      if (normalized.width < 0) {
        normalized.x += normalized.width;
        normalized.width = Math.abs(normalized.width);
      }

      if (normalized.height < 0) {
        normalized.y += normalized.height;
        normalized.height = Math.abs(normalized.height);
      }

      return normalized;
    },
    []
  );

  // Handle annotation resizing
  const resizeAnnotation = useCallback(
    (
      annotation: AnnotationObject,
      handle: ResizeHandle,
      point: Point,
      imageSize: { width: number; height: number }
    ): AnnotationObject => {
      const newAnn = { ...annotation };
      const { x, y } = point;

      const clamp = (value: number, min: number, max: number): number =>
        Math.max(min, Math.min(max, value));

      if (isCornerHandle(handle)) {
        switch (handle) {
          case "tl":
            newAnn.width = clamp(
              annotation.width + (annotation.x - x),
              1,
              annotation.width + annotation.x
            );
            newAnn.height = clamp(
              annotation.height + (annotation.y - y),
              1,
              annotation.height + annotation.y
            );
            newAnn.x = clamp(x, 0, annotation.x + annotation.width - 1);
            newAnn.y = clamp(y, 0, annotation.y + annotation.height - 1);
            break;
          case "tr":
            newAnn.width = clamp(
              x - annotation.x,
              1,
              imageSize.width - annotation.x
            );
            newAnn.height = clamp(
              annotation.height + (annotation.y - y),
              1,
              annotation.height + annotation.y
            );
            newAnn.y = clamp(y, 0, annotation.y + annotation.height - 1);
            break;
          case "bl":
            newAnn.width = clamp(
              annotation.width + (annotation.x - x),
              1,
              annotation.width + annotation.x
            );
            newAnn.height = clamp(
              y - annotation.y,
              1,
              imageSize.height - annotation.y
            );
            newAnn.x = clamp(x, 0, annotation.x + annotation.width - 1);
            break;
          case "br":
            newAnn.width = clamp(
              x - annotation.x,
              1,
              imageSize.width - annotation.x
            );
            newAnn.height = clamp(
              y - annotation.y,
              1,
              imageSize.height - annotation.y
            );
            break;
        }
      } else if (isSideHandle(handle)) {
        switch (handle) {
          case "l":
            newAnn.width = clamp(
              annotation.width + (annotation.x - x),
              1,
              annotation.width + annotation.x
            );
            newAnn.x = clamp(x, 0, annotation.x + annotation.width - 1);
            break;
          case "r":
            newAnn.width = clamp(
              x - annotation.x,
              1,
              imageSize.width - annotation.x
            );
            break;
          case "t":
            newAnn.height = clamp(
              annotation.height + (annotation.y - y),
              1,
              annotation.height + annotation.y
            );
            newAnn.y = clamp(y, 0, annotation.y + annotation.height - 1);
            break;
          case "b":
            newAnn.height = clamp(
              y - annotation.y,
              1,
              imageSize.height - annotation.y
            );
            break;
        }
      }

      return newAnn;
    },
    []
  );

  // Determine which resize handle the mouse is over
  const getResizeHandle = useCallback(
    (point: Point, annotation: AnnotationObject): ResizeHandle => {
      // Increase handle size for better usability
      const handleSize = 12;
      const { x, y } = point;

      // Explicitly calculate edge coordinates
      const left = annotation.x;
      const right = annotation.x + annotation.width;
      const top = annotation.y;
      const bottom = annotation.y + annotation.height;

      // Check corners first
      if (Math.abs(x - left) <= handleSize && Math.abs(y - top) <= handleSize)
        return "tl";
      if (Math.abs(x - right) <= handleSize && Math.abs(y - top) <= handleSize)
        return "tr";
      if (
        Math.abs(x - left) <= handleSize &&
        Math.abs(y - bottom) <= handleSize
      )
        return "bl";
      if (
        Math.abs(x - right) <= handleSize &&
        Math.abs(y - bottom) <= handleSize
      )
        return "br";

      // Then check edges
      if (
        Math.abs(x - left) <= handleSize &&
        y > top + handleSize &&
        y < bottom - handleSize
      )
        return "l";
      if (
        Math.abs(x - right) <= handleSize &&
        y > top + handleSize &&
        y < bottom - handleSize
      )
        return "r";
      if (
        Math.abs(y - top) <= handleSize &&
        x > left + handleSize &&
        x < right - handleSize
      )
        return "t";
      if (
        Math.abs(y - bottom) <= handleSize &&
        x > left + handleSize &&
        x < right - handleSize
      )
        return "b";

      return null;
    },
    []
  );

  // Handle mouse down event
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (editorState.isLocked) return;
      e.preventDefault();

      const hasUnassignedClasses = annotations.some((ann) => !ann.class);
      if (editorState.isDrawing && hasUnassignedClasses) {
        toast.error(
          "Please assign classes to all existing boxes before creating new ones"
        );
        return;
      }

      const point = getMousePosition(e);

      // First check if we're on a resize handle of the selected annotation
      if (selectedAnnotation) {
        const handle = getResizeHandle(point, selectedAnnotation);
        if (handle) {
          updateDragState({
            resizingSide: handle,
          });
          return;
        }
      }

      // Then check if clicked on any annotation
      const clickedAnnotation = annotations.find(
        (ann) =>
          point.x >= ann.x &&
          point.x <= ann.x + ann.width &&
          point.y >= ann.y &&
          point.y <= ann.y + ann.height
      );

      if (clickedAnnotation) {
        // Update selected annotation
        setSelectedAnnotation(clickedAnnotation);

        // Check if this is a resize operation
        const handle = getResizeHandle(point, clickedAnnotation);
        if (handle) {
          updateDragState({
            resizingSide: handle,
          });
        } else {
          // Otherwise it's a drag operation
          updateDragState({
            isDraggingAnnotation: true,
            dragOffset: {
              x: point.x - clickedAnnotation.x,
              y: point.y - clickedAnnotation.y,
            },
          });
        }
      } else {
        // Clicked on empty space
        setSelectedAnnotation(null);

        if (editorState.isDrawing) {
          // Start drawing a new annotation
          const newAnnotation: AnnotationObject = {
            id: `${currentImageId}-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`,
            x: point.x,
            y: point.y,
            width: 0,
            height: 0,
            class: "",
          };
          setCurrentAnnotation(newAnnotation);
        } else {
          // Start panning the image
          updateDragState({
            isDragging: true,
            dragStart: {
              x: e.clientX - imageState.position.x,
              y: e.clientY - imageState.position.y,
            },
          });
        }
      }
    },
    [
      editorState.isLocked,
      editorState.isDrawing,
      getMousePosition,
      annotations,
      selectedAnnotation,
      getResizeHandle,
      updateDragState,
      currentImageId,
      imageState.position.x,
      imageState.position.y,
    ]
  );

  // Handle mouse move event
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (editorState.isLocked) return;
      e.preventDefault();

      const point = getMousePosition(e);

      if (selectedAnnotation && dragState.resizingSide) {
        // Resize an existing annotation
        const resizedAnnotation = resizeAnnotation(
          selectedAnnotation,
          dragState.resizingSide,
          point,
          { width: imageState.width, height: imageState.height }
        );

        // Create a new copy of the annotations array with the updated annotation
        const newAnnotations = annotations.map((ann) =>
          ann.id === selectedAnnotation.id ? resizedAnnotation : ann
        );

        // Update the selected annotation first to ensure UI responsiveness
        setSelectedAnnotation(resizedAnnotation);

        // Then update the parent component with the changed annotations
        onAnnotationsChange(newAnnotations);

        // Set save status to trigger auto-save
        setSaveStatus("unsaved");
      } else if (dragState.isDraggingAnnotation && selectedAnnotation) {
        // Drag an existing annotation
        const newX = point.x - dragState.dragOffset.x;
        const newY = point.y - dragState.dragOffset.y;

        const clampedAnnotation: AnnotationObject = {
          ...selectedAnnotation,
          x: Math.max(
            0,
            Math.min(newX, imageState.width - selectedAnnotation.width)
          ),
          y: Math.max(
            0,
            Math.min(newY, imageState.height - selectedAnnotation.height)
          ),
        };

        // Update the selected annotation first
        setSelectedAnnotation(clampedAnnotation);

        // Then update all annotations
        const newAnnotations = annotations.map((ann) =>
          ann.id === selectedAnnotation.id ? clampedAnnotation : ann
        );

        onAnnotationsChange(newAnnotations);
        setSaveStatus("unsaved");
      } else if (editorState.isDrawing && currentAnnotation) {
        // Draw a new annotation
        const width = Math.min(
          Math.max(0, point.x - currentAnnotation.x),
          imageState.width - currentAnnotation.x
        );
        const height = Math.min(
          Math.max(0, point.y - currentAnnotation.y),
          imageState.height - currentAnnotation.y
        );

        setCurrentAnnotation({
          ...currentAnnotation,
          width,
          height,
        });
      } else if (dragState.isDragging) {
        // Pan the image
        updateImageState({
          position: {
            x: e.clientX - dragState.dragStart.x,
            y: e.clientY - dragState.dragStart.y,
          },
        });
      } else if (selectedAnnotation) {
        // Show resize cursor when hovering over handles of selected annotation
        const handle = getResizeHandle(point, selectedAnnotation);
        if (handle) {
          // Set appropriate cursor based on the handle
          let cursor = "default";
          switch (handle) {
            case "tl":
            case "br":
              cursor = "nwse-resize";
              break;
            case "tr":
            case "bl":
              cursor = "nesw-resize";
              break;
            case "t":
            case "b":
              cursor = "ns-resize";
              break;
            case "l":
            case "r":
              cursor = "ew-resize";
              break;
          }

          if (containerRef.current) {
            containerRef.current.style.cursor = cursor;
          }
        } else if (containerRef.current) {
          containerRef.current.style.cursor = "grab";
        }
      }
    },
    [
      editorState.isLocked,
      editorState.isDrawing,
      dragState,
      selectedAnnotation,
      currentAnnotation,
      imageState.width,
      imageState.height,
      getMousePosition,
      resizeAnnotation,
      updateImageState,
      annotations,
      onAnnotationsChange,
      setSaveStatus,
      getResizeHandle,
    ]
  );

  // Handle mouse up event
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (editorState.isLocked) return;
      e.preventDefault();

      // Reset cursor to default
      if (containerRef.current) {
        containerRef.current.style.cursor = "grab";
      }

      if (
        (dragState.isDraggingAnnotation || dragState.resizingSide) &&
        selectedAnnotation
      ) {
        // Finalize annotation drag or resize
        setHistory((prev) => ({
          annotations: [
            ...prev.annotations.slice(0, prev.currentIndex + 1),
            annotations,
          ],
          currentIndex: prev.currentIndex + 1,
        }));
      } else if (editorState.isDrawing && currentAnnotation) {
        // Finalize drawing a new annotation
        const normalizedAnnotation = normalizeAnnotation(currentAnnotation);

        if (
          normalizedAnnotation.width < minAnnotationSize ||
          normalizedAnnotation.height < minAnnotationSize
        ) {
          toast.error(
            `Box is too small - minimum size is ${minAnnotationSize}x${minAnnotationSize} pixels`
          );
          setCurrentAnnotation(null);
          return;
        }

        if (
          normalizedAnnotation.x < 0 ||
          normalizedAnnotation.y < 0 ||
          normalizedAnnotation.x + normalizedAnnotation.width >
            imageState.width ||
          normalizedAnnotation.y + normalizedAnnotation.height >
            imageState.height
        ) {
          toast.error("Box must be within image bounds");
          setCurrentAnnotation(null);
          return;
        }

        const newAnnotation = {
          ...normalizedAnnotation,
          class: "",
          id: `${currentImageId}-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
        };

        // Update parent annotations with the new box
        const newAnnotations = [...annotations, newAnnotation];
        updateAnnotations(newAnnotations, true); // Add to history

        // Set this as the selected annotation for immediate class assignment
        setSelectedAnnotation(newAnnotation);
        setCurrentAnnotation(null);
      }

      updateDragState({
        isDragging: false,
        isDraggingAnnotation: false,
        resizingSide: null,
      });
    },
    [
      editorState.isLocked,
      editorState.isDrawing,
      dragState.isDraggingAnnotation,
      dragState.resizingSide,
      selectedAnnotation,
      currentAnnotation,
      updateDragState,
      annotations,
      normalizeAnnotation,
      imageState.width,
      imageState.height,
      currentImageId,
      updateAnnotations,
      minAnnotationSize,
    ]
  );

  // Handle annotation deletion
  const handleDeleteAnnotation = useCallback(
    (id: string): void => {
      const newAnnotations = annotations.filter((ann) => ann.id !== id);
      updateAnnotations(newAnnotations, true); // Add to history
      setSelectedAnnotation(null);
      setSaveStatus("unsaved");
      toast("Annotation deleted!", {
        icon: <Trash className="h-4 w-4" />,
      });
    },
    [annotations, updateAnnotations, setSaveStatus]
  );

  // Handle deleting all annotations
  const handleDeleteAll = useCallback((): void => {
    updateAnnotations([], true);
    setSelectedAnnotation(null);
    setSaveStatus("unsaved");
    toast("All annotations deleted!", {
      icon: <Trash className="h-4 w-4" />,
    });
  }, [updateAnnotations, setSaveStatus]);

  // Handle mouse wheel for zooming
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>): void => {
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;

      updateImageState((prev) => {
        const newScale = Math.max(0.1, Math.min(prev.scale * delta, 2));
        const scaleFactor = newScale / prev.scale;

        return {
          ...prev,
          scale: newScale,
          position: {
            x: prev.position.x - (mouseX - prev.position.x) * (scaleFactor - 1),
            y: prev.position.y - (mouseY - prev.position.y) * (scaleFactor - 1),
          },
        };
      });
    },
    [updateImageState]
  );

  // Handle class assignment
  const handleClassAssign = useCallback(
    (annotationId: string, className: string) => {
      const newAnnotations = annotations.map((ann) =>
        ann.id === annotationId ? { ...ann, class: className } : ann
      );

      updateAnnotations(newAnnotations, true);
      setSaveStatus("unsaved");
    },
    [annotations, updateAnnotations, setSaveStatus]
  );

  // Handle bounding box drawing mode toggle
  const handleBoundingBoxMode = useCallback((): void => {
    const hasUnassignedClasses = annotations.some((ann) => !ann.class);

    if (hasUnassignedClasses) {
      toast.error(
        "Please assign classes to all existing boxes before creating new ones"
      );
      return;
    }

    updateEditorState((prev) => ({
      ...prev,
      isDrawing: !prev.isDrawing,
    }));

    setSelectedAnnotation(null);
  }, [updateEditorState, annotations]);

  // Handle save operation
  const handleSave = useCallback(async (): Promise<void> => {
    const hasUnassignedClasses = annotations.some((ann) => !ann.class);

    if (hasUnassignedClasses) {
      toast.error("Please assign classes to all annotations before saving");
      return;
    }

    try {
      const success = await onSave();

      if (!success) {
        throw new Error("Save failed");
      }
    } catch {
      toast.error("Failed to save annotations");
    }
  }, [annotations, onSave]);

  // Handle auto-annotate operation
  const handleAutoAnnotate = useCallback(async (): Promise<void> => {
    if (!onAutoAnnotate) {
      toast.error("Auto-annotation is not available");
      return;
    }

    try {
      await onAutoAnnotate();
    } catch (error) {
      toast.error("Auto-annotation failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [onAutoAnnotate]);

  // Handle requesting changes
  const handleRequestChanges = useCallback(() => {
    if (isAdmin && isReviewMode) {
      setIsReviewDialogOpen(true);
    }
  }, [isAdmin, isReviewMode]);

  // Handle submitting review feedback
  const handleSubmitReviewFeedback = useCallback(async () => {
    if (!reviewFeedback.trim()) {
      toast.error("Please provide feedback for the changes requested");
      return;
    }

    if (!onRequestChanges) {
      toast.error("Cannot submit review feedback");
      return;
    }

    setIsSubmittingReview(true);

    try {
      await onRequestChanges(reviewFeedback);
      setIsReviewDialogOpen(false);
      setReviewFeedback("");
    } catch (error) {
      toast.error("Failed to submit review feedback", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  }, [reviewFeedback, onRequestChanges]);

  // Handle going back with unsaved changes
  const handleGoBack = useCallback(async () => {
    if (saveStatus === "unsaved") {
      const willSave = await new Promise<boolean>((resolve) => {
        toast("You have unsaved changes", {
          action: {
            label: "Save & Exit",
            onClick: () => resolve(true),
          },
          cancel: {
            label: "Discard",
            onClick: () => resolve(false),
          },
        });
      });

      if (willSave) {
        try {
          const success = await onSave();

          if (success) {
            onBack();
          } else {
            throw new Error("Save failed");
          }
        } catch {
          toast.error("Failed to save annotations before exit");

          const forceExit = await new Promise<boolean>((resolve) => {
            toast("Failed to save. Exit anyway?", {
              action: {
                label: "Exit",
                onClick: () => resolve(true),
              },
              cancel: {
                label: "Stay",
                onClick: () => resolve(false),
              },
            });
          });

          if (forceExit) {
            onBack();
          }
        }
      } else {
        onBack();
      }
    } else {
      onBack();
    }
  }, [saveStatus, onSave, onBack]);

  // Undo operation
  const handleUndo = useCallback(() => {
    if (history.currentIndex > 0) {
      const newIndex = history.currentIndex - 1;
      setHistory((prev) => ({ ...prev, currentIndex: newIndex }));

      // Use preventNextHistoryUpdateRef to avoid duplicate history entries
      preventNextHistoryUpdateRef.current = true;
      onAnnotationsChange(history.annotations[newIndex]);

      setSaveStatus("unsaved");

      toast("Undo Operation Performed!", {
        icon: <Undo className="h-4 w-4" />,
      });
    }
  }, [history, onAnnotationsChange, setSaveStatus]);

  // Redo operation
  const handleRedo = useCallback(() => {
    if (history.currentIndex < history.annotations.length - 1) {
      const newIndex = history.currentIndex + 1;
      setHistory((prev) => ({ ...prev, currentIndex: newIndex }));

      // Use preventNextHistoryUpdateRef to avoid duplicate history entries
      preventNextHistoryUpdateRef.current = true;
      onAnnotationsChange(history.annotations[newIndex]);

      setSaveStatus("unsaved");

      toast("Redo Operation Performed!", {
        icon: <Redo className="h-4 w-4" />,
      });
    }
  }, [history, onAnnotationsChange, setSaveStatus]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === "ArrowLeft" && hasPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === "ArrowRight" && hasNext && onNext) {
        onNext();
      }

      if (ctrlKey) {
        switch (e.key.toLowerCase()) {
          case "z": {
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          }
          case "c": {
            if (selectedAnnotation) {
              e.preventDefault();
              void navigator.clipboard
                .writeText(JSON.stringify(selectedAnnotation))
                .then(() => {
                  toast("Annotation copied!", {
                    icon: <Clipboard className="h-4 w-4" />,
                  });
                })
                .catch(() => {
                  toast.error("Failed to copy annotation");
                });
            }
            break;
          }
          case "v": {
            e.preventDefault();
            void navigator.clipboard
              .readText()
              .then((text) => {
                try {
                  const pastedAnnotation = JSON.parse(text);

                  if (
                    pastedAnnotation &&
                    typeof pastedAnnotation === "object" &&
                    "x" in pastedAnnotation &&
                    "y" in pastedAnnotation &&
                    "width" in pastedAnnotation &&
                    "height" in pastedAnnotation
                  ) {
                    const newAnnotation: AnnotationObject = {
                      ...pastedAnnotation,
                      id: `${currentImageId}-${Date.now()}-${Math.random()
                        .toString(36)
                        .substring(2, 9)}`,
                    };

                    const newAnnotations = [...annotations, newAnnotation];
                    updateAnnotations(newAnnotations, true);
                    setSaveStatus("unsaved");

                    toast("Annotation pasted!", {
                      icon: <Clipboard className="h-4 w-4" />,
                    });
                  } else {
                    throw new Error("Invalid annotation format");
                  }
                } catch {
                  toast.error("Invalid annotation data");
                }
              })
              .catch(() => {
                toast.error("Failed to paste annotation");
              });
            break;
          }
          case "d": {
            if (selectedAnnotation) {
              e.preventDefault();
              handleDeleteAnnotation(selectedAnnotation.id);
            }
            break;
          }
          case "s": {
            e.preventDefault();
            handleSave();
            break;
          }
        }
      } else if (e.key === "Escape") {
        if (editorState.isDrawing) {
          updateEditorState({ isDrawing: false });
          setCurrentAnnotation(null);
        } else if (!isReviewDialogOpen) {
          onBack();
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedAnnotation) {
          handleDeleteAnnotation(selectedAnnotation.id);
        }
      } else if (e.key === "b" || e.key === "B") {
        handleBoundingBoxMode();
      } else if (e.key === "r" || e.key === "R") {
        handleReset();
      } else if (e.key === "l" || e.key === "L") {
        updateEditorState((prev) => ({ ...prev, isLocked: !prev.isLocked }));
      }
    },
    [
      hasPrevious,
      onPrevious,
      hasNext,
      onNext,
      handleRedo,
      handleUndo,
      selectedAnnotation,
      currentImageId,
      annotations,
      updateAnnotations,
      setSaveStatus,
      handleDeleteAnnotation,
      handleSave,
      editorState.isDrawing,
      isReviewDialogOpen,
      updateEditorState,
      onBack,
      handleBoundingBoxMode,
      handleReset,
    ]
  );

  // Set up keyboard shortcuts
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Initial image loading and setup
  useEffect(() => {
    const img: HTMLImageElement = new Image();

    img.onload = () => {
      updateImageState({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });

      if (onImageLoad) {
        onImageLoad(img.naturalWidth, img.naturalHeight);
      }

      centerImage();
    };

    img.src = imageUrl;

    // Reset user action tracking on image change
    userActedRef.current = false;
  }, [imageUrl, updateImageState, centerImage, onImageLoad]);

  // Color utility for annotations
  const getAnnotationColor = (id: string): string => {
    const annotation = annotations.find((a) => a.id === id);

    if (annotation && annotation.class) {
      const classObj = availableClasses.find(
        (cls) => cls.name === annotation.class
      );

      if (classObj && classObj.color) {
        return classObj.color;
      }

      const classNames = availableClasses.map((c) =>
        typeof c === "string" ? c : c.name
      );
      const className = annotation.class;
      const classIndex = classNames.indexOf(className);

      const classColors = [
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFFF00",
        "#FF00FF",
        "#00FFFF",
        "#FF8000",
        "#8000FF",
        "#0080FF",
        "#FF0080",
        "#80FF00",
        "#00FF80",
      ];

      if (classIndex >= 0) {
        return classColors[classIndex % classColors.length];
      }
    }

    // Generate a deterministic color based on ID
    const hash = id.split("").reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);

    return `hsl(${hash % 360}, 70%, 50%)`;
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-white overflow-hidden">
      {/* Back button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          className="p-2 rounded-full bg-white shadow-lg border border-gray-200/50 hover:bg-gray-50"
          onClick={handleGoBack}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation controls */}
      <NavigationControls
        onNext={onNext}
        onPrevious={onPrevious}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        currentIndex={currentIndex}
        totalImage={totalImages}
      />

      {/* Auto-save indicator */}
      <AutosaveIndicator status={saveStatus} />

      {/* Main canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden"
        style={{
          cursor: dragState.isDragging ? "grabbing" : "grab",
          backgroundImage:
            "radial-gradient(circle at 10px 10px, #f0f0f0 2px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${imageState.position.x}px, ${imageState.position.y}px) scale(${imageState.scale})`,
            transformOrigin: "top left",
            width: imageState.width,
            height: imageState.height,
          }}
          className="relative"
        >
          <NextImage
            ref={imageRef}
            src={imageUrl}
            alt="Annotation canvas"
            className="rounded-xl"
            width={imageState.width}
            height={imageState.height}
            priority
            unoptimized
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* Render all annotations */}
          {annotations.map((annotation, index) => (
            <Annotation
              key={`annotation-${annotation.id}`}
              annotation={annotation}
              isSelected={selectedAnnotation?.id === annotation.id}
              hasClass={!!annotation.class}
              index={index}
              getColor={getAnnotationColor}
            />
          ))}

          {/* Render the annotation currently being drawn */}
          {currentAnnotation && (
            <Annotation
              key={`drawing-${currentAnnotation.id}`}
              annotation={currentAnnotation}
              isSelected={false}
              isDrawing={true}
              index={annotations.length}
              getColor={getAnnotationColor}
            />
          )}
        </div>
      </div>

      {/* Image controls */}
      <ImageMover
        isLocked={editorState.isLocked}
        onZoomIn={() => handleZoom(1.1)}
        onZoomOut={() => handleZoom(0.9)}
        onReset={handleReset}
        onLockToggle={() =>
          updateEditorState((prev) => ({
            ...prev,
            isLocked: !prev.isLocked,
          }))
        }
        zoomPercentage={Math.round(imageState.scale * 100)}
      />

      {/* Help dialog */}
      <HelpDialog />

      {/* Annotation toolbar */}
      <AnnotationToolbar
        onBoundingBoxCreateMode={handleBoundingBoxMode}
        onDeleteAll={handleDeleteAll}
        onSave={handleSave}
        onAutoAnnotate={isOfficeUser ? handleAutoAnnotate : undefined}
        onRequestChanges={
          isAdmin && isReviewMode ? handleRequestChanges : undefined
        }
        isDrawing={editorState.isDrawing}
        isAdmin={isAdmin}
        isOfficeUser={isOfficeUser}
        isSaving={isSaving}
      />

      {/* Status indicators */}
      <StatusInfo
        isDrawing={editorState.isDrawing}
        isLocked={editorState.isLocked}
        imageFeedback={imageFeedback}
        isReviewMode={isReviewMode}
      />

      {/* Annotation list panel */}
      <AnnotationListPanel
        annotations={annotations}
        availableClasses={availableClasses}
        onClassChange={handleClassAssign}
        onDelete={handleDeleteAnnotation}
        selectedAnnotationId={selectedAnnotation?.id || null}
        onAnnotationSelect={(id) => {
          const annotation = annotations.find((a) => a.id === id);
          setSelectedAnnotation(annotation || null);
        }}
      />

      {/* Review feedback dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Provide feedback for the annotator:
            </label>
            <Textarea
              placeholder="Describe what changes are needed..."
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              rows={5}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReviewDialogOpen(false)}
              disabled={isSubmittingReview}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReviewFeedback}
              disabled={isSubmittingReview || !reviewFeedback.trim()}
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

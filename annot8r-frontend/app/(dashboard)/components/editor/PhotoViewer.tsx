import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import NextImage from "next/image";
import { debounce } from "lodash";
import { ArrowLeft, Clipboard, Redo, Trash, Undo } from "lucide-react";
import { toast } from "sonner";
// Types
import type {
  PhotoViewerProps,
  Annotation as AnnotationType,
  Point,
  ImageState,
  DragState,
  EditorState,
  AutosaveStatus,
  ResizeHandle,
  ResizeOperation,
} from "@/lib/types/editor";
// Components
import { isCornerHandle, isSideHandle } from "@/lib/types/editor";
import { isValidAnnotation } from "@/lib/utils/validation";
import AutosaveIndicator from "./AutoSaveIndicator";
import AnnotationToolbar from "./AnnotationToolbar";
import ImageMover from "./ImageMover";
import Annotation from "./Annotation";
import { NavigationControls } from "./PaginationTool";
import { StatusInfo } from "./StatusInfo";
import { HelpDialog } from "./HelpDialog";
import { motion } from "framer-motion";
import AnnotationListPanel from "./LabelSidebar";
import { fetchWithAuth } from "@/lib/apis/config";

export function PhotoViewer({
  currentImageId,
  annotationState,
  availableClasses,
  isOfficeUser,
  imageUrl,
  onSave,
  onNext,
  onPrevious,
  onBack,
  hasPrevious,
  hasNext,
  currentIndex,
  totalImages,
  isAdmin = false,
  projectId
}: PhotoViewerProps): React.ReactElement {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const MIN_BOX_SIZE = 20; // Minimum 20px for both width and height

  const [imageState, setImageState] = useState<ImageState>({
    width: 0,
    height: 0,
    scale: 0.5, // Change from 1 to 0.5 for a smaller initial size
    position: { x: 0, y: 0 },
  });

  console.log(isOfficeUser);

  // Annotations State
  const [annotations, setAnnotations] = useState<AnnotationType[]>(() =>
    annotationState.annotations.map((ann) => ({
      ...ann,
      id: ann.id || `${currentImageId}-${Date.now()}-${crypto.randomUUID()}`,
    }))
  );
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<AnnotationType | null>(null);
  const [currentAnnotation, setCurrentAnnotation] =
    useState<AnnotationType | null>(null);

  // Drag State
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    isDraggingAnnotation: false,
    dragStart: { x: 0, y: 0 },
    dragOffset: { x: 0, y: 0 },
    resizingSide: null,
  });

  // Editor State
  const [editorState, setEditorState] = useState<EditorState>({
    isLocked: false,
    isDrawing: false,
  });

  // History State
  const [history, setHistory] = useState<{
    annotations: AnnotationType[][];
    currentIndex: number;
  }>({
    annotations: [annotationState.annotations],
    currentIndex: 0,
  });

  // Autosave State
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>(
    annotationState.isAnnotated ? "saved" : "not_available"
  );

  // Memoized state updates
  const updateHistory = useCallback(
    (newAnnotations: AnnotationType[]): void => {
      setHistory((prev) => ({
        annotations: [
          ...prev.annotations.slice(0, prev.currentIndex + 1),
          newAnnotations,
        ],
        currentIndex: prev.currentIndex + 1,
      }));
    },
    []
  );

  const updateDragState = useCallback((updates: Partial<DragState>): void => {
    setDragState((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateEditorState = useCallback(
    (
      updates: Partial<EditorState> | ((prev: EditorState) => EditorState)
    ): void => {
      if (typeof updates === "function") {
        setEditorState(updates);
      } else {
        setEditorState((prev) => ({ ...prev, ...updates }));
      }
    },
    []
  );

  const updateImageState = useCallback(
    (
      updates: Partial<ImageState> | ((prev: ImageState) => ImageState)
    ): void => {
      if (typeof updates === "function") {
        setImageState(updates);
      } else {
        setImageState((prev) => ({ ...prev, ...updates }));
      }
    },
    []
  );

  // Center image helper
  const centerImage = useCallback((): void => {
    if (!containerRef.current || !imageRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const imgWidth = imageRef.current.naturalWidth;
    const imgHeight = imageRef.current.naturalHeight;

    // Calculate scale to fit within container with some padding
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = imgWidth / imgHeight;
    let scale = 0.5; // Default scale

    // Adjust scale to fit within container while maintaining aspect ratio
    if (containerAspect > imageAspect) {
      // Container is wider than image
      scale = (containerRect.height * 0.8) / imgHeight;
    } else {
      // Container is taller than image
      scale = (containerRect.width * 0.8) / imgWidth;
    }

    // Ensure scale is not too large or too small
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

  // Image zoom helpers
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

  const handleReset = useCallback((): void => {
    if (!containerRef.current || !imageRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const imgWidth = imageRef.current.naturalWidth;
    const imgHeight = imageRef.current.naturalHeight;

    // Calculate scale to fit
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
      scale: scale,
      width: imgWidth,
      height: imgHeight,
      position: {
        x: (containerRect.width - imgWidth * scale) / 2,
        y: (containerRect.height - imgHeight * scale) / 2,
      },
    });
  }, [updateImageState]);

  // Mouse position utility
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

  // Annotation utilities
  const normalizeAnnotation = useCallback(
    (ann: AnnotationType): AnnotationType => {
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

  const resizeAnnotation = useCallback(
    ({
      annotation,
      handle,
      point,
      imageSize,
    }: ResizeOperation): AnnotationType => {
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

  // Autosave implementation
  const debouncedSave = useMemo(
    () =>
      debounce(async (annotationsToSave: AnnotationType[]) => {
        if (autosaveStatus === "unsaved") {
          setAutosaveStatus("saving");
          try {
            await onSave(annotationsToSave);
            setAutosaveStatus("saved");
          } catch {
            setAutosaveStatus("unsaved");
            toast.error("Failed to save annotations");
          }
        }
      }, 2000),
    [autosaveStatus, onSave]
  );

  // Get resize handle based on point
  const getResizeHandle = useCallback(
    (point: Point, annotation: AnnotationType): ResizeHandle => {
      const handleSize = 10;
      const { x, y } = point;
      const corners = [
        { handle: "tl" as const, x: annotation.x, y: annotation.y },
        {
          handle: "tr" as const,
          x: annotation.x + annotation.width,
          y: annotation.y,
        },
        {
          handle: "bl" as const,
          x: annotation.x,
          y: annotation.y + annotation.height,
        },
        {
          handle: "br" as const,
          x: annotation.x + annotation.width,
          y: annotation.y + annotation.height,
        },
      ];

      // Check corners
      for (const corner of corners) {
        if (
          Math.abs(x - corner.x) <= handleSize &&
          Math.abs(y - corner.y) <= handleSize
        ) {
          return corner.handle;
        }
      }

      // Check sides
      if (Math.abs(x - annotation.x) <= handleSize) return "l";
      if (Math.abs(x - (annotation.x + annotation.width)) <= handleSize)
        return "r";
      if (Math.abs(y - annotation.y) <= handleSize) return "t";
      if (Math.abs(y - (annotation.y + annotation.height)) <= handleSize)
        return "b";

      return null;
    },
    []
  );

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (editorState.isLocked) return;
    e.preventDefault();

    const hasUnassignedClasses = annotations.some(ann => !ann.class);
    
    if (editorState.isDrawing && hasUnassignedClasses) {
      toast.error("Please assign classes to all existing boxes before creating new ones");
      return;
    }

    const point = getMousePosition(e);
      const clickedAnnotation = annotations.find(
        (ann) =>
          point.x >= ann.x &&
          point.x <= ann.x + ann.width &&
          point.y >= ann.y &&
          point.y <= ann.y + ann.height
      );

      if (clickedAnnotation) {
        setSelectedAnnotation(clickedAnnotation);
        const handle = getResizeHandle(point, clickedAnnotation);

        if (handle) {
          updateDragState({
            resizingSide: handle,
          });
        } else {
          updateDragState({
            isDraggingAnnotation: true,
            dragOffset: {
              x: point.x - clickedAnnotation.x,
              y: point.y - clickedAnnotation.y,
            },
          });
        }
      } else {
        setSelectedAnnotation(null);
        if (editorState.isDrawing) {
          const newAnnotation: AnnotationType = {
            id: `${currentImageId}-${Date.now()}-${crypto.randomUUID()}`,
            x: point.x,
            y: point.y,
            width: 0,
            height: 0,
            class: "",
          };
          console.log("Creating new annotation:", newAnnotation); // Debug log
          setCurrentAnnotation(newAnnotation);
        } else {
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
      getResizeHandle,
      updateDragState,
      currentImageId,
      imageState.position.x,
      imageState.position.y,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (editorState.isLocked) return;
      e.preventDefault();

      const point = getMousePosition(e);

      if (selectedAnnotation && dragState.resizingSide) {
        const resizedAnnotation = resizeAnnotation({
          annotation: selectedAnnotation,
          handle: dragState.resizingSide,
          point,
          imageSize: { width: imageState.width, height: imageState.height },
        });

        setAnnotations((prevAnnotations) =>
          prevAnnotations.map((ann) =>
            ann.id === selectedAnnotation.id ? resizedAnnotation : ann
          )
        );
        setSelectedAnnotation(resizedAnnotation);
        setAutosaveStatus("unsaved");
      } else if (dragState.isDraggingAnnotation && selectedAnnotation) {
        const newX = point.x - dragState.dragOffset.x;
        const newY = point.y - dragState.dragOffset.y;

        const clampedAnnotation: AnnotationType = {
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

        setAnnotations((prevAnnotations) =>
          prevAnnotations.map((ann) =>
            ann.id === selectedAnnotation.id ? clampedAnnotation : ann
          )
        );
        setSelectedAnnotation(clampedAnnotation);
        setAutosaveStatus("unsaved");
      } else if (editorState.isDrawing && currentAnnotation) {
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
          height
        });
      } else if (dragState.isDragging) {
        updateImageState({
          position: {
            x: e.clientX - dragState.dragStart.x,
            y: e.clientY - dragState.dragStart.y,
          },
        });
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
    ]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (editorState.isLocked) return;
      e.preventDefault();
  
      if (
        dragState.isDraggingAnnotation ||
        (selectedAnnotation && dragState.resizingSide)
      ) {
        updateHistory(annotations);
        setAutosaveStatus("unsaved");
      } else if (editorState.isDrawing && currentAnnotation) {
        const normalizedAnnotation = normalizeAnnotation(currentAnnotation);
        
        // Check minimum size
        if (normalizedAnnotation.width < MIN_BOX_SIZE || 
            normalizedAnnotation.height < MIN_BOX_SIZE) {
          toast.error("Box is too small - minimum size is 20x20 pixels");
          setCurrentAnnotation(null);
          return;
        }
  
        // Check if box is within image bounds
        if (normalizedAnnotation.x < 0 || 
            normalizedAnnotation.y < 0 ||
            normalizedAnnotation.x + normalizedAnnotation.width > imageState.width ||
            normalizedAnnotation.y + normalizedAnnotation.height > imageState.height) {
          toast.error("Box must be within image bounds");
          setCurrentAnnotation(null);
          return;
        }
  
        // Create annotation
        setAnnotations(prev => [...prev, {
          ...normalizedAnnotation,
          class: "",
          id: `${currentImageId}-${Date.now()}-${crypto.randomUUID()}`
        }]);
        
        setCurrentAnnotation(null);
      }
  
      updateDragState({
        isDragging: false,
        isDraggingAnnotation: false,
        resizingSide: null,
      });
    },
    [editorState.isLocked, editorState.isDrawing, dragState.isDraggingAnnotation, dragState.resizingSide, selectedAnnotation, currentAnnotation, updateDragState, updateHistory, annotations, normalizeAnnotation, imageState.width, imageState.height, currentImageId]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string): void => {
      setAnnotations((prev) => {
        const newAnnotations = prev.filter((ann) => ann.id !== id);
        updateHistory(newAnnotations);
        return newAnnotations;
      });
      setSelectedAnnotation(null);
      setAutosaveStatus("unsaved");
      toast("Annotation deleted!", {
        icon: <Trash className="h-4 w-4" />,
      });
    },
    [updateHistory]
  );

  const handleDeleteAll = useCallback((): void => {
    setAnnotations([]);
    setSelectedAnnotation(null);
    updateHistory([]);
    setAutosaveStatus("unsaved");
    toast("All annotations deleted!", {
      icon: <Trash className="h-4 w-4" />,
    });
  }, [updateHistory]);

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

  // Keyboard event handlers
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // Navigation
      if (e.key === "ArrowLeft" && hasPrevious) {
        onPrevious();
      } else if (e.key === "ArrowRight" && hasNext) {
        onNext();
      }

      // Shortcuts
      if (ctrlKey) {
        switch (e.key.toLowerCase()) {
          case "z": {
            e.preventDefault();
            if (
              e.shiftKey &&
              history.currentIndex < history.annotations.length - 1
            ) {
              // Redo
              const newIndex = history.currentIndex + 1;
              setHistory((prev) => ({ ...prev, currentIndex: newIndex }));
              setAnnotations(history.annotations[newIndex]);
              setAutosaveStatus("unsaved");
              toast("Redo Operation Performed!", {
                icon: <Redo className="h-4 w-4" />,
              });
            } else if (!e.shiftKey && history.currentIndex > 0) {
              // Undo
              const newIndex = history.currentIndex - 1;
              setHistory((prev) => ({ ...prev, currentIndex: newIndex }));
              setAnnotations(history.annotations[newIndex]);
              setAutosaveStatus("unsaved");
              toast("Undo Operation Performed!", {
                icon: <Undo className="h-4 w-4" />,
              });
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
                  if (isValidAnnotation(pastedAnnotation)) {
                    const newAnnotation: AnnotationType = {
                      ...pastedAnnotation,
                      id: crypto.randomUUID(),
                    };
                    setAnnotations((prev) => [...prev, newAnnotation]);
                    updateHistory([...annotations, newAnnotation]);
                    setAutosaveStatus("unsaved");
                    toast("Annotation pasted!", {
                      icon: <Clipboard className="h-4 w-4" />,
                    });
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
        }
      } else if (e.key === "Escape") {
        // Cancel current operation
        if (editorState.isDrawing) {
          updateEditorState({ isDrawing: false });
          setCurrentAnnotation(null);
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedAnnotation) {
          handleDeleteAnnotation(selectedAnnotation.id);
        }
      }
    },
    [
      editorState.isDrawing,
      selectedAnnotation,
      history,
      annotations,
      hasPrevious,
      hasNext,
      onNext,
      onPrevious,
      updateEditorState,
      updateHistory,
      handleDeleteAnnotation,
    ]
  );

  // UI Event Handlers
  const handleClassAssign = useCallback(
    (annotationId: string, className: string) => {
      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === annotationId ? { ...ann, class: className } : ann
        )
      );
      setAutosaveStatus("unsaved");
    },
    []
  );

  const handleBoundingBoxMode = useCallback((): void => {
    // Check if there are any unassigned classes
    const hasUnassignedClasses = annotations.some(ann => !ann.class);
    
    if (hasUnassignedClasses) {
      toast.error("Please assign classes to all existing boxes before creating new ones");
      return;
    }
  
    updateEditorState((prev) => ({
      ...prev,
      isDrawing: !prev.isDrawing,
    }));
    setSelectedAnnotation(null);
  }, [updateEditorState, annotations]);

  const handleSave = useCallback(async (): Promise<void> => {
    const hasUnassignedClasses = annotations.some((ann) => !ann.class);

    if (hasUnassignedClasses) {
      toast.error("Please assign classes to all annotations before saving");
      return;
    }

    try {
      setAutosaveStatus("saving");
      await onSave(annotations);
      setAutosaveStatus("saved");
      toast.success("Annotations saved successfully");
    } catch {
      setAutosaveStatus("unsaved");
      toast.error("Failed to save annotations");
    }
  }, [annotations, onSave]);

  // Effects
  useEffect(() => {
    debouncedSave(annotations);
    return () => {
      debouncedSave.cancel();
    };
  }, [annotations, debouncedSave]);

  useEffect(() => {
    const img: HTMLImageElement = new Image();
    img.onload = () => {
      updateImageState({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      centerImage();
    };
    img.src = imageUrl;
  }, [imageUrl, updateImageState, centerImage]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Inside PhotoViewer.tsx

  const handleGoBack = useCallback(async () => {
    // Check for unsaved changes
    if (autosaveStatus === "unsaved") {
      const willSave = await new Promise((resolve) => {
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
          // Try to save changes
          setAutosaveStatus("saving");
          await onSave(annotations);
          setAutosaveStatus("saved");
          onBack(); // Navigate back after successful save
        } catch {
          toast.error("Failed to save annotations before exit");
          // Let user decide whether to leave without saving
          const forceExit = await new Promise((resolve) => {
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
        // User chose to discard changes
        onBack();
      }
    } else {
      // No unsaved changes, just go back
      onBack();
    }
  }, [autosaveStatus, annotations, onSave, onBack]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Only trigger if not in drawing mode or class dialog
        if (!editorState.isDrawing) {
          handleGoBack();
        }
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [editorState.isDrawing, handleGoBack]);

  const handleRequestChanges = useCallback(async () => {
    if (!isAdmin) return;
    
    // Use a simple prompt for feedback
    const feedback = window.prompt("Please provide feedback for the annotator:");
    if (feedback === null) return; // User cancelled
    
    try {
      // Call API to request changes
      await fetchWithAuth(`/projects/${projectId}/images/${currentImageId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'changes_requested',
          feedback
        })
      });
      
      toast.success("Change request sent to annotator");
      
      // Move to next image if available
      if (hasNext) {
        onNext();
      }
    } catch (error) {
      toast.error("Failed to submit change request");
      console.error(error);
    }
  }, [isAdmin, projectId, currentImageId, hasNext, onNext]);

  // Render
  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-white overflow-hidden">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <motion.button
          className="p-2 rounded-full bg-white shadow-lg border border-gray-200/50 hover:bg-gray-50"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleGoBack}
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Navigation Controls */}
      <NavigationControls
        onNext={onNext}
        onPrevious={onPrevious}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        currentIndex={currentIndex}
        totalImage={totalImages}
      />

      {/* Autosave Indicator */}
      <AutosaveIndicator status={autosaveStatus} />

      {/* Main Canvas Area */}
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

          {/* Annotations */}
          {annotations.map((annotation, index) => (
            <Annotation
              key={`annotation-${currentImageId}-${
                annotation.id || crypto.randomUUID()
              }`}
              annotation={annotation}
              isSelected={annotation.id === selectedAnnotation?.id}
              hasClass={!!annotation.class}
              index={index}
            />
          ))}

          {/* Current Drawing Annotation */}
          {currentAnnotation && (
            <Annotation
              key={`drawing-${currentAnnotation.id}`}
              annotation={currentAnnotation}
              isSelected={false}
              isDrawing={true}
              index={annotations.length}
            />
          )}
        </div>
      </div>

      {/* Image Controls */}
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

      {/* Help Dialog */}
      <HelpDialog />

      {/* Annotation Controls */}
      <AnnotationToolbar
        onBoundingBoxCreateMode={handleBoundingBoxMode}
        onDeleteAll={handleDeleteAll}
        onSave={handleSave}
        isDrawing={editorState.isDrawing}
        isAdmin={isAdmin}
        onRequestChanges={isAdmin ? handleRequestChanges : undefined}
      />

      {/* Status Information */}
      <StatusInfo
        isDrawing={editorState.isDrawing}
        isLocked={editorState.isLocked}
      />

      {/* Class Assignment Dialog */}
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
    </div>
  );
}

export default React.memo(PhotoViewer);

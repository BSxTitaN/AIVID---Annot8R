// lib/types/editor.ts
export interface Annotation {
  id: string;
  class: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ImageState extends Size {
  scale: number;
  position: Point;
}

export interface DragState {
  isDragging: boolean;
  isDraggingAnnotation: boolean;
  dragStart: Point;
  dragOffset: Point;
  resizingSide: ResizeHandle;
}

export interface EditorState {
  isLocked: boolean;
  isDrawing: boolean;
}

export type AutosaveStatus = "saved" | "saving" | "unsaved" | "not_available";

export type ResizeHandle = 
  | "tl" | "tr" | "bl" | "br"  // corners
  | "t" | "r" | "b" | "l"      // sides
  | null;

export interface ResizeOperation {
  annotation: Annotation;
  handle: ResizeHandle;
  point: Point;
  imageSize: Size;
}

export interface PhotoViewerProps {
  currentImageId: string;
  annotationState: {
    annotations: Annotation[];
    isAnnotated: boolean;
  };
  availableClasses: string[];
  isOfficeUser: boolean;
  imageUrl: string;
  onSave: (annotations: Annotation[]) => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
  onBack: () => void;  // Add this line
  hasPrevious: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalImages: number;
}

export interface AnnotationProps {
  annotation: Annotation;
  isSelected: boolean;
  isDrawing?: boolean;
  onDelete?: () => void;
}

export interface ImageMoverProps {
  isLocked: boolean;
  zoomPercentage: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onLockToggle: () => void;
}

export interface AnnotationToolbarProps {
  isDrawing: boolean;
  onBoundingBoxCreateMode: () => void;
  onDeleteAll: () => void;
  onSave: () => void;
}

export interface ClassAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (className: string) => void;
  availableClasses: string[];
}

export interface AutosaveIndicatorProps {
  status: AutosaveStatus;
}

// Type Guard Functions
export const isCornerHandle = (handle: ResizeHandle): handle is "tl" | "tr" | "bl" | "br" => {
  return handle === "tl" || handle === "tr" || handle === "bl" || handle === "br";
};

export const isSideHandle = (handle: ResizeHandle): handle is "t" | "r" | "b" | "l" => {
  return handle === "t" || handle === "r" || handle === "b" || handle === "l";
};

export const isValidResizeHandle = (handle: string | null): handle is ResizeHandle => {
  return isCornerHandle(handle as ResizeHandle) || isSideHandle(handle as ResizeHandle) || handle === null;
};
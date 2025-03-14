export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
}

export interface ImageState {
  width: number;
  height: number;
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
  | "tl"
  | "tr"
  | "bl"
  | "br"
  | "t"
  | "r"
  | "b"
  | "l"
  | null;

export function isCornerHandle(
  handle: ResizeHandle
): handle is "tl" | "tr" | "bl" | "br" {
  return (
    handle === "tl" || handle === "tr" || handle === "bl" || handle === "br"
  );
}

export function isSideHandle(
  handle: ResizeHandle
): handle is "t" | "r" | "b" | "l" {
  return handle === "t" || handle === "r" || handle === "b" || handle === "l";
}

export interface ResizeOperation {
  annotation: Annotation;
  handle: ResizeHandle;
  point: Point;
  imageSize: {
    width: number;
    height: number;
  };
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
  onSave: (annotations: Annotation[]) => Promise<boolean>;
  onNext: () => void;
  onPrevious: () => void;
  onBack: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalImages: number;
  isAdmin?: boolean;
  projectId: string;
}

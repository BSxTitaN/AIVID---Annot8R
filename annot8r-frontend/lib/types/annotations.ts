// lib/types/annotations.ts

export interface Annotation {
  id: string;
  class: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationState {
  annotations: Annotation[];
  isAnnotated: boolean;
}

export interface AnnotationResponse {
  success: boolean;
  data?: AnnotationState;
  error?: string;
}

export interface ClassesResponse {
  success: boolean;
  data?: {
    classes: string[];
    isOfficeUser: boolean;
  };
  error?: string;
}

export interface PhotoViewerProps {
  currentImageId: string;
  annotationState: AnnotationState;
  availableClasses: string[];
  isOfficeUser: boolean;
  onSave: (annotations: Annotation[], customClass?: string) => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}
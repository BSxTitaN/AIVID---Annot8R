// lib/types/projects.ts
export interface Project {
  id: string;
  name: string;
  totalImages: number;
  annotatedImages: number;
  remainingImages: number;
  isSubmitted: boolean;
  submittedAt?: string;
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface Annotation {
  class: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageMetadata {
  id: string;
  originalName: string;
  url: string;
  lastModified: Date;
  isAnnotated: boolean;
  annotations: Annotation[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    currentPage: number;
    totalPages: number;
    nextCursor?: string;
    prevCursor?: string;
    limit: number;
    annotatedTotal: number;
    annotationRemaining: number;
  };
}

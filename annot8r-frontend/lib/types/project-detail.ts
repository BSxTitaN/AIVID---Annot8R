// types/project-detail.ts

export type FilterType = "all" | "annotated" | "unannotated";

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
  lastModified: string;
  isAnnotated: boolean;
  annotations: Annotation[];
}

export interface PaginationInfo {
  total: number;
  currentPage: number;
  totalPages: number;
  nextCursor?: string;
  prevCursor?: string;
  limit: number;
  annotatedTotal: number;
  annotationRemaining: number;
}

// In lib/types/project-detail.ts
export interface PaginatedImagesResponse {
  items: ImageMetadata[];
  pagination: PaginationInfo;
  isSubmitted: boolean;
  submittedAt?: string;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  filter?: FilterType;
}

export interface StatsProps {
  total: number;
  annotatedTotal: number;
  annotationRemaining: number;
}
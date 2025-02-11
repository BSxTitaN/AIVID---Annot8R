// lib/apis/images.ts
import { fetchWithAuth } from './config';

export interface ImageMetadata {
  id: string;
  originalName: string;
  url: string;
  lastModified: string;
  isAnnotated: boolean;
  annotations: Annotation[];
}

export interface Annotation {
  class: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PaginatedImagesResponse {
  items: ImageMetadata[];
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

export async function getProjectImages(
  userId: string, 
  projectId: string,
  cursor?: string,
  limit?: number
): Promise<PaginatedImagesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);
  if (limit) params.append('limit', limit.toString());

  return fetchWithAuth(`/projects/${userId}/${projectId}/images?${params}`);
}

export async function getImage(userId: string, projectId: string, imageId: string) {
  return fetchWithAuth(`/images/${userId}/${projectId}/${imageId}`);
}
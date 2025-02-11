// lib/apis/projects.ts
import { ProjectsResponse } from '../types/projects';
import { fetchWithAuth } from './config';
import type {
  PaginatedImagesResponse,
  PaginationParams,
  ImageMetadata
} from '@/lib/types/project-detail';

// Define interface for raw API response before transformation
interface RawImageMetadata {
  id: string;
  originalName: string;
  url: string;
  lastModified: Date | string;
  isAnnotated: boolean;
  annotations: {
    class: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

export async function getAllProjects(userId: string): Promise<ProjectsResponse> {
  const response = await fetchWithAuth(`/projects/${userId}`);
  return response;
}

export async function getProjectImages(
  userId: string, 
  projectId: string,
  options?: PaginationParams
): Promise<PaginatedImagesResponse> {
  const params = new URLSearchParams();
  
  if (options?.cursor) {
    params.append('cursor', options.cursor);
  }
  
  if (options?.limit) {
    params.append('limit', options.limit.toString());
  }

  const queryString = params.toString();
  const url = `/projects/${userId}/${projectId}/images${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetchWithAuth(url);
  
  // Log the response for debugging
  console.log('Project images response:', response);
  
  return {
    ...response,
    items: response.items.map((item: RawImageMetadata): ImageMetadata => ({
      ...item,
      lastModified: item.lastModified instanceof Date 
        ? item.lastModified.toISOString() 
        : String(item.lastModified)
    }))
  };
}
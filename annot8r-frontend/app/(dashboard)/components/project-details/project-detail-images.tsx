/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getProjectImages } from "@/lib/apis/projects";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { getAuthToken } from "@/lib/actions/auth";
import type { 
  ImageMetadata, 
  PaginationInfo,
  StatsProps 
} from "@/lib/types/project-detail";
import { usePageData } from "@/lib/context/page-data-context";
import { useAuth } from "@/lib/context/auth";
import { UserRole } from "@/lib/types/auth";
import { AdminProjectStatus } from "@/app/(admin)/components/users/AdminProjectStatus";
import { SubmitProjectButton } from "./SubmitProjectBtn";

// Props types
interface ImageCellProps {
  image: ImageMetadata;
  token: string;
  onClick: () => void;
}

interface HeaderProps {
  projectId: string;
  onBack: () => void;
}

interface PageCursors {
  [page: number]: string;
}

interface ProjectDetailImagesProps {
  userId: string;
  isAdmin?: boolean; // Add this to know if it's admin view
}

// Memoized Header Component
const Header = memo(function Header({ projectId, onBack }: HeaderProps) {
  return (
    <div className="h-16 flex items-center justify-between">
      <div className="flex gap-2 items-center">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-2xl bg-[#F4F4F4] text-gray-500 hover:bg-gray-500 
                   hover:text-white transition-colors duration-200 flex items-center gap-2 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold">{projectId}</h1>
      </div>
    </div>
  );
});

// Optimized Image Cell Component
const ImageCell = memo(function ImageCell({ image, token, onClick }: ImageCellProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<'initial' | 'loading' | 'loaded'>('initial');
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    const loadImage = async () => {
      try {
        setLoadingStage('loading');
        const response = await fetch(image.url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });

        if (!response.ok) throw new Error('Failed to load image');

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
        setLoadingStage('loaded');
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load image:', error);
          setError(true);
          setLoadingStage('loaded');
        }
      }
    };

    loadImage();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image.url, token]);

  return (
    <div 
      onClick={onClick}
      className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-50 cursor-pointer 
                 transform transition-transform duration-200 hover:scale-[1.02]"
    >
      {/* Placeholder/Error State */}
      {(loadingStage === 'initial' || error) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
          <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">
            {error ? 'Failed to load image' : 'Loading image...'}
          </p>
        </div>
      )}

      {/* Image */}
      {imageUrl && (
        <div className="w-full h-full">
          <img
            src={imageUrl}
            alt={image.originalName}
            className={`w-full h-full object-cover transition-all duration-500
              ${loadingStage === 'loaded' ? 'opacity-100' : 'opacity-0'}
            `}
          />
        </div>
      )}

      {/* Progressive Info Overlay */}
      <div className={`
        absolute inset-x-0 bottom-0 
        bg-gradient-to-t from-black/80 via-black/40 to-transparent
        backdrop-blur-[2px]
        transition-all duration-300
        ${loadingStage === 'loaded' ? 'h-24 opacity-100' : 'h-0 opacity-0'}
      `}>
        <div className="absolute bottom-0 p-4 w-full">
          <p className="text-white font-medium truncate mb-2">
            {image.originalName}
          </p>
          <div className="flex items-center gap-2">
            <span className={`
              px-2 py-0.5 rounded-full text-xs font-medium
              ${image.isAnnotated 
                ? "bg-green-500/80 text-white" 
                : "bg-orange-500/80 text-white"}
            `}>
              {image.isAnnotated 
                ? `${image.annotations.length} annotations` 
                : "Not Annotated"}
            </span>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loadingStage === 'loading' && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}
    </div>
  );
});

// Memoized Stats Component
const Stats = memo(function Stats({ 
  total, 
  annotatedTotal, 
  annotationRemaining 
}: StatsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 p-4 bg-white rounded-[24px] shadow-lg">
      <div className="text-center">
        <p className="text-sm text-gray-500">Total Images</p>
        <p className="text-2xl font-semibold">{total}</p>
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-500">Annotated</p>
        <p className="text-2xl font-semibold text-green-600">{annotatedTotal}</p>
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-500">Remaining</p>
        <p className="text-2xl font-semibold text-orange-600">{annotationRemaining}</p>
      </div>
    </div>
  );
});

// Main Component
export default function ProjectDetailImages({ userId }: ProjectDetailImagesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const { user } = useAuth();
  const { setEditorData } = usePageData();

  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cursors, setCursors] = useState<PageCursors>({});
  const [currentPage, setCurrentPage] = useState(1);

  const [submissionStatus, setSubmissionStatus] = useState<{
    isSubmitted: boolean;
    submittedAt?: string;
  }>({
    isSubmitted: false
  });

  const handleImageClick = useCallback((clickedImageId: string) => {
    if (!projectId) return;
    
    setEditorData({
      imageIds: images.map(img => img.id),
      userId,
      projectId,
      clickedImageId
    });
    
    // Use different paths for admin and user
    const basePath = user?.role === UserRole.ADMIN ? '/admin/users' : '/dashboard';
    router.push(`${basePath}/${projectId}/editor`);
  }, [projectId, router, images, setEditorData, userId, user?.role]);

  const fetchImages = useCallback(async (page: number, cursor?: string) => {
    if (!projectId || !token) return;

    setLoading(true);
    try {
      const response = await getProjectImages(userId, projectId, {
        cursor,
        limit: 30,
      });
      
      setImages(response.items);
      setPagination(response.pagination);
      // Add submission status
      setSubmissionStatus({
        isSubmitted: response.isSubmitted || false,
        submittedAt: response.submittedAt
      });
      
      setCurrentPage(page);
      
      if (response.pagination.nextCursor) {
        setCursors(prev => ({
          ...prev,
          [page + 1]: response.pagination.nextCursor!
        }));
      }
      
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load images';
      setError(message);
      toast.error("Error loading images", { description: message });
    } finally {
      setLoading(false);
    }
  }, [projectId, userId, token]);

  useEffect(() => {
    const initializeToken = async () => {
      const newToken = await getAuthToken();
      if (newToken) {
        setToken(newToken);
        fetchImages(1);
      }
    };

    initializeToken();
  }, [fetchImages]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage === currentPage) return;
    
    const cursor = newPage === 1 ? undefined : cursors[newPage];
    fetchImages(newPage, cursor);
  }, [currentPage, cursors, fetchImages]);

  if (!projectId) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Project ID not found
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Header projectId={projectId} onBack={() => router.back()} />

      {user?.role === UserRole.ADMIN ? (
          <AdminProjectStatus
            username={userId}
            projectId={projectId!}
            isSubmitted={submissionStatus.isSubmitted}
            submittedAt={submissionStatus.submittedAt}
            onStatusChange={() => fetchImages(currentPage)}
          />
        ) : (
          <SubmitProjectButton
            userId={userId}
            projectId={projectId!}
            isSubmitted={submissionStatus.isSubmitted}
            onSubmissionChange={() => fetchImages(currentPage)}
          />
        )}

      {loading && !images.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="aspect-[4/3] rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" 
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((image) => (
              <ImageCell 
                key={image.id} 
                image={image} 
                token={token}
                onClick={() => handleImageClick(image.id)}
              />
            ))}
          </div>

          <div className="fixed bottom-4 right-4 space-y-2">
            {pagination && (
              <>
                <Stats
                  total={pagination.total}
                  annotatedTotal={pagination.annotatedTotal}
                  annotationRemaining={pagination.annotationRemaining}
                />

                {pagination.totalPages > 1 && (
                  <div className="p-2 bg-white rounded-[24px] shadow-lg">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 
                                disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2">
                        Page {currentPage} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === pagination.totalPages || loading}
                        className="px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 
                                disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
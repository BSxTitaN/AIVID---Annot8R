// app/(admin)/admin/projects/[projectId]/review/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { usePageData } from "@/lib/context/page-data-context";
import {
  getClasses,
  getAnnotations,
  updateAnnotations,
} from "@/lib/apis/annotations";
import type { Annotation, AnnotationState } from "@/lib/types/annotations";
import PhotoViewer from "@/app/(dashboard)/components/editor/PhotoViewer";
import { getImage } from "@/lib/apis/images";
import { getAuthToken } from "@/lib/actions/auth";

export default function AdminReviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  
  const { editorData } = usePageData();
  const [isLoading, setIsLoading] = useState(true);
  const [annotationClasses, setAnnotationClasses] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOfficeUser, setIsOfficeUser] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [annotationState, setAnnotationState] = useState<AnnotationState>({
    annotations: [],
    isAnnotated: false,
  });
  const [token, setToken] = useState<string | null>(null);

  // Navigate back if no editor data
  useEffect(() => {
    if (!editorData) {
      router.replace(`/admin/projects/${projectId}`);
    } else {
      const init = async () => {
        try {
          const authToken = await getAuthToken();
          setToken(authToken ?? null);
        } catch (error) {
          console.error("Error initializing:", error);
          toast.error("Failed to get auth token");
        }
      };
      init();
    }
  }, [editorData, router, projectId]);

  // Fetch image data
  const fetchImage = useCallback(async () => {
    if (!editorData || !token) return;

    const controller = new AbortController();
    let objectUrl = "";

    try {
      const currentImageId = editorData.imageIds[currentImageIndex];
      setImageUrl(""); // Clear previous image URL

      const imageData = await getImage(
        editorData.userId,
        editorData.projectId,
        currentImageId
      );

      // Check if component is still mounted (controller not aborted)
      if (controller.signal.aborted) return;

      const response = await fetch(imageData.url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Failed to load image");

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
      setImageUrl(objectUrl);
    } catch (error) {
      if (!controller.signal.aborted) {
        // Only show error if not aborted
        toast.error("Failed to load image", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        console.error("Error loading image:", error);
      }
    }

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [editorData, currentImageIndex, token]);

  // Fetch classes and annotations
  const fetchClasses = useCallback(async () => {
    if (!editorData) return;

    try {
      const { classes, isOfficeUser: isOffice } = await getClasses(
        editorData.userId,
        editorData.projectId
      );
      setAnnotationClasses(classes);
      setIsOfficeUser(isOffice);
    } catch (error) {
      toast.error("Failed to load annotation classes");
      console.error("Error loading classes:", error);
    }
  }, [editorData]);

  const fetchAnnotations = useCallback(async () => {
    if (!editorData) return;

    try {
      const currentImageId = editorData.imageIds[currentImageIndex];
      const annotations = await getAnnotations(
        editorData.userId,
        editorData.projectId,
        currentImageId
      );
      setAnnotationState(annotations);
    } catch (error) {
      toast.error("Failed to load annotations");
      console.error("Error loading annotations:", error);
    }
  }, [editorData, currentImageIndex]);

  useEffect(() => {
    if (!editorData || !token) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchImage(), fetchClasses(), fetchAnnotations()]);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [fetchImage, fetchClasses, fetchAnnotations, editorData, token]);

  // Save annotations handler
  const handleSaveAnnotations = useCallback(
    async (annotations: Annotation[], customClass?: string) => {
      if (!editorData) return;

      try {
        const currentImageId = editorData.imageIds[currentImageIndex];
        await updateAnnotations(
          editorData.userId,
          editorData.projectId,
          currentImageId,
          annotations,
          customClass
        );

        setAnnotationState((prev) => ({
          ...prev,
          annotations,
          isAnnotated: annotations.length > 0,
        }));

        toast.success("Annotations saved successfully");
      } catch (error) {
        toast.error("Failed to save annotations");
        console.error("Error saving annotations:", error);
      }
    },
    [editorData, currentImageIndex]
  );

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (!editorData) return;
    if (currentImageIndex < editorData.imageIds.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  }, [editorData, currentImageIndex]);

  const handlePrevious = useCallback(() => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  }, [currentImageIndex]);

  if (!editorData || isLoading || !imageUrl) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <PhotoViewer
        currentImageId={editorData.imageIds[currentImageIndex]}
        annotationState={annotationState}
        availableClasses={annotationClasses}
        isOfficeUser={isOfficeUser}
        imageUrl={imageUrl}
        onSave={handleSaveAnnotations}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onBack={() => router.back()}
        currentIndex={currentImageIndex}
        totalImages={editorData.imageIds.length}
        hasPrevious={currentImageIndex > 0}
        hasNext={currentImageIndex < editorData.imageIds.length - 1}
        isAdmin={true} // Pass this prop to enable admin-specific UI
        projectId={editorData.projectId} // Pass this from editorData
      />
    </div>
  );
}
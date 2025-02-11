"use client";

// app/(dashboard)/projects/[projectId]/page.tsx
import ProjectDetailImages from "@/app/(dashboard)/components/project-details/project-detail-images"
import { useSearchParams } from "next/navigation";

export default function ProjectPage() {

  const searchParams = useSearchParams();
  const username = searchParams.get('username');

  return (
    <div className="w-full min-h-screen bg-white pgnCtn">
      <ProjectDetailImages userId={username as string} />
    </div>
  )
}
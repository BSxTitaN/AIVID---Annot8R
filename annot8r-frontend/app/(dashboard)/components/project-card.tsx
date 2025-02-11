// app/(dashboard)/components/project-card.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Project } from "@/lib/types/projects";
import { Folder, Image as ImageIcon, MoreVertical } from "lucide-react";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const progressPercentage = Math.round(
    (project.annotatedImages / project.totalImages) * 100
  );

  return (
    <Link
      href={`/dashboard/projects?projectId=${encodeURIComponent(project.name)}`}
      className="block group"
    >
      <Card className="relative overflow-hidden border border-gray-200 hover:border-gray-300 transition-all duration-200">
        <div className="aspect-[4/3] bg-gray-50 p-4">
          <div className="h-full rounded-md bg-white border-2 border-dashed border-gray-200 flex items-center justify-center">
            <Folder className="h-12 w-12 text-gray-400" />
          </div>
        </div>

        <div className="absolute top-2 right-2">
          <button className="p-1 rounded-full bg-white/80 backdrop-blur border border-gray-200/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium truncate">{project.name}</h2>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-base font-medium text-gray-600">
                {project.totalImages}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-semibold text-green-600">
                {progressPercentage}%
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{project.annotatedImages} Annotated</span>
              <span>{project.remainingImages} Remaining</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div
                className="bg-green-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

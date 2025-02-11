// app/(dashboard)/components/client-project-grid.tsx
'use client';

import { toast } from 'sonner';
import { Folder } from "lucide-react";
import { ProjectCard } from './project-card';
import { ProjectHeader } from './project-header';
import { Project } from '@/lib/types/projects';

interface ClientProjectGridProps {
  initialProjects?: Project[];
  error?: string;
}

export function ClientProjectGrid({ initialProjects, error }: ClientProjectGridProps) {
  if (!initialProjects && !error) {
    return (
      <div className="space-y-8 pgnCtn">
        <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    toast.error('Failed to load projects', {
      description: error,
    });

    return (
      <div className="space-y-6 pgnCtn">
        <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="text-sm">Failed to load projects: {error}</p>
        </div>
      </div>
    );
  }

  const projects = initialProjects || [];

  return (
    <div className="space-y-8 pgnCtn">
      <ProjectHeader count={projects.length} />

      {projects.length === 0 ? (
        <div className="text-center py-12 rounded-lg bg-gray-50">
          <Folder className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
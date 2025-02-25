// app/(admin)/admin/projects/[projectId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProjectDetails } from "@/lib/apis/projects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Project } from "@/lib/types/project";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectHeader } from "@/app/(admin)/components/projects/ProjectHeader";
import { ProjectOverview } from "@/app/(admin)/components/projects/details/ProjectOverview";
import { ProjectMembers } from "@/app/(admin)/components/projects/details/ProjectMembers";
import { ProjectImages } from "@/app/(admin)/components/projects/details/ProjectImages";
import { ProjectSettings } from "@/app/(admin)/components/projects/details/ProjectSettings";
import { toast } from "sonner";

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      if (!projectId) {
        setError("Project ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching project with ID:", projectId);
        
        const data = await getProjectDetails(projectId);
        console.log("Project details response:", data);
        
        if (!data) {
          setError("Project not found");
        } else {
          setProject(data);
          setError(null);
        }
      } catch (error) {
        console.error("Failed to load project:", error);
        setError(error instanceof Error ? error.message : "Failed to load project");
        toast.error("Error loading project details");
      } finally {
        setLoading(false);
      }
    }

    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 bg-red-50 rounded-lg text-red-800">
        <h2 className="text-2xl font-bold mb-2">Project not found</h2>
        <p>{error || "Failed to load project details"}</p>
        <p className="mt-4 text-sm">Project ID: {projectId}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverview project={project} />
        </TabsContent>

        <TabsContent value="members">
          <ProjectMembers project={project} />
        </TabsContent>

        <TabsContent value="images">
          <ProjectImages project={project} />
        </TabsContent>

        <TabsContent value="settings">
          <ProjectSettings 
            project={project} 
            onUpdate={(updatedProject) => setProject(updatedProject)} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
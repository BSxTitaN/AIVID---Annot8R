// app/(admin)/components/projects/ProjectOverview.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllProjects } from "@/lib/apis/projects";
import type { Project } from "@/lib/types/project";
import { ProjectsChart } from "./ProjectChart";
import { ProjectStats } from "./ProjectStats";
import { RecentActivity } from "./RecentActivity";

export function ProjectsOverview() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const data = await getAllProjects();
        setProjects(data.projects);
        setError(null);
      } catch (err) {
        setError("Failed to load projects");
        console.error("Error fetching projects:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  // Calculate overall stats
  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalImages: projects.reduce((acc, p) => acc + p.totalImages, 0),
    completedAnnotations: projects.reduce((acc, p) => acc + p.stats.completedImages, 0),
    reviewPending: projects.reduce(
      (acc, p) => acc + (p.stats.completedImages - p.stats.approvedImages), 
      0
    ),
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProjectStats 
          loading={loading} 
          error={error} 
          stats={stats} 
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Annotation Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectsChart 
              loading={loading} 
              projects={projects} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity 
              loading={loading} 
              projects={projects} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// app/(admin)/components/projects/details/ProjectOverview.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProjectStats } from "../ProjectStats";
import type { Project } from "@/lib/types/project";
import { ProjectsChart } from "../ProjectChart";

interface ProjectOverviewProps {
  project: Project;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const stats = {
    total: 1,
    active: project.status === 'active' ? 1 : 0,
    completed: project.status === 'completed' ? 1 : 0,
    totalImages: project.totalImages,
    completedAnnotations: project.stats.completedImages,
    reviewPending: project.stats.completedImages - project.stats.approvedImages
  };

  const completionRate = (project.stats.completedImages / project.totalImages) * 100;
  const approvalRate = (project.stats.approvedImages / project.totalImages) * 100;

  return (
    <div className="space-y-6">
      <ProjectStats loading={false} error={null} stats={stats} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span className="font-medium">{Math.round(completionRate)}%</span>
              </div>
              <Progress value={completionRate} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Approval Rate</span>
                <span className="font-medium">{Math.round(approvalRate)}%</span>
              </div>
              <Progress value={approvalRate} className="bg-blue-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectsChart loading={false} projects={[project]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
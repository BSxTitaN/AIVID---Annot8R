// components/admin/projects/project-detail/project-overview.tsx
import { Project, ProjectClass } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ProjectExportsPanel } from "./project-exports-panel";

interface ProjectOverviewProps {
  project: Project;
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  // Function to parse ISO date string to Date object safely
  const parseDate = (dateString?: string): Date | null => {
    if (!dateString) return null;
    try {
      return new Date(dateString);
    } catch {
      return null;
    }
  };

  const createdAt = parseDate(project.createdAt);
  const updatedAt = parseDate(project.updatedAt);

  return (
    <div className="space-y-6">
      {/* Project Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
          <CardDescription>
            Overall completion status of the project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Completion</span>
              <span className="font-medium">
                {project.completionPercentage}%
              </span>
            </div>
            <Progress value={project.completionPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/40 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">
                Images Annotated
              </div>
              <div className="mt-1 flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {project.annotatedImages}/{project.totalImages}
                </div>
                <div className="text-sm">
                  {project.totalImages > 0
                    ? Math.round(
                        (project.annotatedImages / project.totalImages) * 100
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/40 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">
                Images Reviewed
              </div>
              <div className="mt-1 flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {project.reviewedImages}/{project.totalImages}
                </div>
                <div className="text-sm">
                  {project.totalImages > 0
                    ? Math.round(
                        (project.reviewedImages / project.totalImages) * 100
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/40 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">
                Images Approved
              </div>
              <div className="mt-1 flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {project.approvedImages}/{project.totalImages}
                </div>
                <div className="text-sm">
                  {project.totalImages > 0
                    ? Math.round(
                        (project.approvedImages / project.totalImages) * 100
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Details and Classes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>Basic details about this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">
                  Name
                </span>
                <span className="font-medium">{project.name}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">
                  Description
                </span>
                <span>{project.description}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">
                  Format
                </span>
                <span>{project.annotationFormat}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">
                  Custom Classes
                </span>
                <span>
                  {project.allowCustomClasses ? "Allowed" : "Not Allowed"}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">
                  Created
                </span>
                <span>{createdAt ? format(createdAt, "PPP") : "Unknown"}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">
                  Last Updated
                </span>
                <span>{updatedAt ? format(updatedAt, "PPP") : "Unknown"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Annotation Classes</CardTitle>
            <CardDescription>Classes defined for this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.classes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No classes defined
                </p>
              ) : (
                project.classes.map((cls: ProjectClass) => (
                  <div key={cls.id} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cls.color }}
                    />
                    <span className="flex-1">{cls.name}</span>
                    {cls.isCustom && (
                      <Badge variant="outline" className="text-xs">
                        Custom
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Exports Section */}
      {project.totalImages > 0 && (
        <ProjectExportsPanel projectId={project.id} />
      )}
    </div>
  );
}

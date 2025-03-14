import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Folder,
  FolderPlus,
  FolderCheck,
  FolderCog,
  FolderArchive,
} from "lucide-react";

interface ProjectStatCardsProps {
  totalProjects: number;
  createdProjects: number;
  inProgressProjects: number;
  completedProjects: number;
  archivedProjects: number;
}

export function ProjectStatCards({
  totalProjects,
  createdProjects,
  inProgressProjects,
  completedProjects,
  archivedProjects,
}: ProjectStatCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          <Folder className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProjects}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total annotation projects
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Created</CardTitle>
          <FolderPlus className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{createdProjects}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>
              {totalProjects > 0
                ? `${Math.round(
                    (createdProjects / totalProjects) * 100
                  )}% of total projects`
                : "No projects yet"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <FolderCog className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inProgressProjects}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>
              {totalProjects > 0
                ? `${Math.round(
                    (inProgressProjects / totalProjects) * 100
                  )}% of total projects`
                : "No projects yet"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <FolderCheck className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedProjects}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>
              {totalProjects > 0
                ? `${Math.round(
                    (completedProjects / totalProjects) * 100
                  )}% of total projects`
                : "No projects yet"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Archived</CardTitle>
          <FolderArchive className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{archivedProjects}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>
              {totalProjects > 0
                ? `${Math.round(
                    (archivedProjects / totalProjects) * 100
                  )}% of total projects`
                : "No projects yet"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

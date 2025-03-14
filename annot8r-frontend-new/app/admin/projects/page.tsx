import { Metadata } from "next";
import { ProjectManagement } from "@/components/admin/projects/project-management";

export const metadata: Metadata = {
  title: "Project Management - Annot8R Admin",
  description: "Manage annotation projects in the platform",
};

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page header */}
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Project Management
        </h1>
        <p className="text-muted-foreground">
          Create and manage annotation projects for your organization.
        </p>
      </div>

      {/* Project management component */}
      <ProjectManagement />
    </div>
  );
}

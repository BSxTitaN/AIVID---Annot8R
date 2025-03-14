import { Button } from "@/components/ui/button";
import { Folder, Plus } from "lucide-react";

interface ProjectEmptyStateProps {
  onCreateProject: () => void;
  showCreateButton: boolean;
}

export function ProjectEmptyState({
  onCreateProject,
  showCreateButton,
}: ProjectEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Folder className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No projects found</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        {showCreateButton
          ? "You haven't created any projects yet. Create your first project to get started."
          : "There are no projects matching your current filters. Try adjusting your search or filter criteria."}
      </p>
      {showCreateButton && (
        <Button onClick={onCreateProject}>
          <Plus className="mr-2 h-4 w-4" /> Create Your First Project
        </Button>
      )}
    </div>
  );
}

// components/users/ProjectActionDialog.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Project {
  id: string;
  name: string;
  totalImages?: number;
  annotatedImages?: number;
  remainingImages?: number;
}

type DialogType = 'create-project' | 'rename-project' | null;

interface DialogState {
  type: DialogType;
  project?: Project;
}

interface ProjectActionDialogProps {
  state: DialogState;
  username?: string;
  onClose: () => void;
  onAction: {
    createProject: (username: string, projectName: string) => Promise<boolean>;
    renameProject: (username: string, projectId: string, newName: string) => Promise<boolean>;
  };
}

export function ProjectActionDialog({
  state,
  username,
  onClose,
  onAction,
}: ProjectActionDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (state.type === 'rename-project' && state.project) {
      setProjectName(state.project.name);
    } else {
      setProjectName("");
    }
  }, [state.type, state.project]);

  const handleAction = async () => {
    if (!username || !projectName.trim()) return;

    setIsSubmitting(true);
    try {
      let success = false;

      if (state.type === 'create-project') {
        success = await onAction.createProject(username, projectName.trim());
      } else if (state.type === 'rename-project' && state.project) {
        success = await onAction.renameProject(username, state.project.id, projectName.trim());
      }

      if (success) {
        handleClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setProjectName("");
    onClose();
  };

  const getDialogContent = () => {
    switch (state.type) {
      case 'create-project':
        return {
          title: 'Create New Project',
          description: 'Enter name for the new project:',
          action: 'Create Project'
        };
      case 'rename-project':
        return {
          title: 'Rename Project',
          description: 'Enter new name for the project:',
          action: 'Rename Project'
        };
      default:
        return {
          title: '',
          description: '',
          action: ''
        };
    }
  };

  const dialogContent = getDialogContent();

  return (
    <Dialog open={state.type !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogContent.title}</DialogTitle>
          <DialogDescription>{dialogContent.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="projectName" className="text-sm font-medium">
              Project Name
            </label>
            <Input
              id="projectName"
              placeholder="Enter project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAction}
            disabled={isSubmitting || !projectName.trim()}
          >
            {isSubmitting ? "Processing..." : dialogContent.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
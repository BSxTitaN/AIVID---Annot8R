// components/admin/projects/project-detail/project-settings.tsx
import { useState } from "react";
import {
  Project,
  ProjectClass,
  ProjectStatus,
} from "@/lib/types";
import { updateProject, deleteProject } from "@/lib/api/projects";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, RefreshCw } from "lucide-react";

interface ProjectSettingsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectSettings({ project, onUpdate }: ProjectSettingsProps) {
  const router = useRouter();
  const [description, setDescription] = useState(project.description);
  const [allowCustomClasses, setAllowCustomClasses] = useState(
    project.allowCustomClasses
  );
  const [status, setStatus] = useState(project.status);
  const [classes, setClasses] = useState<ProjectClass[]>(project.classes);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAddClass = () => {
    // Generate random color
    const randomColor = `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`;
    setClasses([
      ...classes,
      {
        id: `temp-${Date.now()}`,
        name: "",
        color: randomColor,
        isCustom: false,
      },
    ]);
  };

  const handleRemoveClass = (index: number) => {
    const newClasses = [...classes];
    newClasses.splice(index, 1);
    setClasses(newClasses);
  };

  const handleClassChange = (
    index: number,
    field: keyof ProjectClass,
    value: string
  ) => {
    const newClasses = [...classes];
    newClasses[index] = {
      ...newClasses[index],
      [field]: value,
    };
    setClasses(newClasses);
  };

  const handleProjectUpdate = async () => {
    // Validate that we have at least one class with a name
    if (
      classes.length === 0 ||
      !classes.some((cls) => cls.name.trim() !== "")
    ) {
      toast.error("At least one class with a name is required");
      return;
    }

    const emptyClasses = classes.filter((cls) => cls.name.trim() === "");
    if (emptyClasses.length > 0) {
      toast.error(`${emptyClasses.length} class(es) have empty names`);
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = {
        description,
        allowCustomClasses,
        status,
        classes,
      };

      const response = await updateProject(project.id, updateData);

      if (response.success && response.data) {
        toast.success("Project updated successfully");
        onUpdate(response.data);
      } else {
        toast.error("Failed to update project", {
          description: response.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Error updating project", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteProject(project.id);

      if (response.success) {
        toast.success("Project deleted successfully");
        router.push("/admin/projects");
      } else {
        toast.error("Failed to delete project", {
          description: response.error || "An error occurred",
        });
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Error deleting project", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Settings</CardTitle>
          <CardDescription>Update project details and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={project.name}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Project name cannot be changed after creation
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-format">Annotation Format</Label>
            <Input
              id="project-format"
              value={project.annotationFormat}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Currently only YOLO format is supported
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-status">Project Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as ProjectStatus)}
            >
              <SelectTrigger id="project-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProjectStatus.CREATED}>Created</SelectItem>
                <SelectItem value={ProjectStatus.IN_PROGRESS}>
                  In Progress
                </SelectItem>
                <SelectItem value={ProjectStatus.COMPLETED}>
                  Completed
                </SelectItem>
                <SelectItem value={ProjectStatus.ARCHIVED}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between space-y-0 pt-2">
            <div className="space-y-0.5">
              <Label htmlFor="allow-custom-classes">Allow Custom Classes</Label>
              <p className="text-muted-foreground text-sm">
                Let annotators create custom classes
              </p>
            </div>
            <Switch
              id="allow-custom-classes"
              checked={allowCustomClasses}
              onCheckedChange={setAllowCustomClasses}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            disabled={isUpdating}
            onClick={() => {
              setDescription(project.description);
              setAllowCustomClasses(project.allowCustomClasses);
              setStatus(project.status);
              setClasses(project.classes);
            }}
          >
            Reset
          </Button>
          <Button onClick={handleProjectUpdate} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Classes Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Annotation Classes</CardTitle>
          <CardDescription>
            Define the object classes for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {classes.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No classes defined yet
              </div>
            ) : (
              <div className="space-y-3">
                {classes.map((cls, index) => (
                  <div key={cls.id} className="flex gap-3">
                    <Input
                      value={cls.color}
                      onChange={(e) =>
                        handleClassChange(index, "color", e.target.value)
                      }
                      type="color"
                      className="w-16 p-1 h-10"
                    />
                    <Input
                      value={cls.name}
                      onChange={(e) =>
                        handleClassChange(index, "name", e.target.value)
                      }
                      placeholder="Class name"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveClass(index)}
                      disabled={classes.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddClass}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            disabled={isUpdating}
            onClick={() => setClasses(project.classes)}
          >
            Reset
          </Button>
          <Button onClick={handleProjectUpdate} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader className="text-destructive">
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription className="text-destructive/80">
            Irreversible actions for this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-y-0">
            <div>
              <h4 className="font-medium">Delete Project</h4>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. This will permanently delete the
                project, all its images, annotations, and related data.
              </p>
            </div>
            <AlertDialog
              open={showDeleteConfirm}
              onOpenChange={setShowDeleteConfirm}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Project</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the project &quot;{project.name}&quot; and all associated
                    data including images, annotations, and submissions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteProject();
                    }}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Project
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

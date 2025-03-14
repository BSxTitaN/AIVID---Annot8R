import { useState } from "react";
import { createProject } from "@/lib/api/projects";
import { type CreateProjectRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";

// Component for handling each project class input
interface ClassInputProps {
  index: number;
  value: { name: string; color: string };
  onChange: (index: number, value: { name: string; color: string }) => void;
  onRemove: (index: number) => void;
  isRemovable: boolean;
}

const ClassInput = ({ index, value, onChange, onRemove, isRemovable }: ClassInputProps) => {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Class name"
        value={value.name}
        onChange={(e) => onChange(index, { ...value, name: e.target.value })}
        className="flex-1"
      />
      <Input
        type="color"
        value={value.color}
        onChange={(e) => onChange(index, { ...value, color: e.target.value })}
        className="w-16 p-1 h-10"
      />
      {isRemovable && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

// Schema for project creation form
const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name is too long"),
  description: z.string().min(1, "Description is required"),
  annotationFormat: z.string().min(1, "Annotation format is required"),
  allowCustomClasses: z.boolean().default(false),
});

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<Array<{ name: string; color: string }>>([
    { name: "Person", color: "#FF0000" },
    { name: "Car", color: "#00FF00" },
    { name: "Bike", color: "#0000FF" },
  ]);

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      annotationFormat: "YOLO", // Currently only YOLO is supported
      allowCustomClasses: false,
    },
  });

  const handleAddClass = () => {
    // Generate a random hex color
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    setClasses([...classes, { name: "", color: randomColor }]);
  };

  const handleClassChange = (
    index: number,
    value: { name: string; color: string }
  ) => {
    const newClasses = [...classes];
    newClasses[index] = value;
    setClasses(newClasses);
  };

  const handleClassRemove = (index: number) => {
    if (classes.length > 1) {
      const newClasses = [...classes];
      newClasses.splice(index, 1);
      setClasses(newClasses);
    }
  };

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    // Validate that we have at least one class with a name
    if (classes.length === 0 || !classes.some(cls => cls.name.trim() !== "")) {
      setError("At least one class with a name is required");
      return;
    }

    // Filter out empty class names
    const validClasses = classes.filter(cls => cls.name.trim() !== "");
    if (validClasses.length === 0) {
      setError("At least one class with a name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const projectData: CreateProjectRequest = {
        ...values,
        classes: validClasses,
      };

      const response = await createProject(projectData);

      if (response.success) {
        form.reset();
        setClasses([
          { name: "Person", color: "#FF0000" },
          { name: "Car", color: "#00FF00" },
          { name: "Bike", color: "#0000FF" },
        ]);
        onProjectCreated();
      } else {
        setError(response.error || "Failed to create project");
        toast.error("Failed to create project", {
          description: response.error || "An error occurred while creating the project.",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error("Error", { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new annotation project for your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto pr-1" style={{ maxHeight: "calc(85vh - 180px)" }}>

        {error && (
          <div className="bg-destructive/10 p-3 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Annotation Project" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the purpose and details of this project"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

                          <FormField
              control={form.control}
              name="annotationFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annotation Format</FormLabel>
                  <FormControl>
                    <Input disabled {...field} />
                  </FormControl>
                  <FormDescription>
                    Currently only YOLO annotation format is supported
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <FormLabel>Classes</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddClass}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Class
                </Button>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {classes.map((cls, index) => (
                  <ClassInput
                    key={index}
                    index={index}
                    value={cls}
                    onChange={handleClassChange}
                    onRemove={handleClassRemove}
                    isRemovable={classes.length > 1}
                  />
                ))}
              </div>
              <FormDescription>
                Define the object classes for this project. Each class needs a name and a color.
              </FormDescription>
            </div>

            <FormField
              control={form.control}
              name="allowCustomClasses"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Allow Custom Classes</FormLabel>
                    <FormDescription>
                      Users can create their own classes during annotation
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
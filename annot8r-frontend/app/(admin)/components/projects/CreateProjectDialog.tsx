// app/(admin)/components/projects/CreateProjectDialog.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createProject } from "@/lib/apis/projects";
import { AnnotationFormat, ProjectStatus } from "@/lib/types/project";

const formSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  modelFormat: z.nativeEnum(AnnotationFormat),
  allowCustomClasses: z.boolean().default(false),
  requireReview: z.boolean().default(true),
  autoDistribute: z.boolean().default(true),
  classes: z.array(z.string()).min(1, "At least one class is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [newClass, setNewClass] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modelFormat: AnnotationFormat.YOLO,
      allowCustomClasses: false,
      requireReview: true,
      autoDistribute: true,
      classes: [],
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await createProject({
        name: values.name,
        description: values.description,
        settings: {
          modelFormat: values.modelFormat,
          allowCustomClasses: values.allowCustomClasses,
          requireReview: values.requireReview,
          autoDistribute: values.autoDistribute,
        },
        classes: values.classes,
        status: ProjectStatus.DRAFT,
        totalImages: 1, // Set a default value greater than 0 to pass validation
        members: [], // Include the required members property
      });

      toast.success("Project created successfully");
      onOpenChange(false);
      form.reset();
      setClasses([]);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleAddClass = () => {
    if (newClass.trim() && !classes.includes(newClass.trim())) {
      const updatedClasses = [...classes, newClass.trim()];
      setClasses(updatedClasses);
      form.setValue("classes", updatedClasses);
      setNewClass("");
    }
  };

  const handleRemoveClass = (classToRemove: string) => {
    const updatedClasses = classes.filter((c) => c !== classToRemove);
    setClasses(updatedClasses);
    form.setValue("classes", updatedClasses);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up a new annotation project with your desired configuration.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
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
                      placeholder="Enter project description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modelFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annotation Format</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={AnnotationFormat.YOLO}>
                        YOLO
                      </SelectItem>
                      <SelectItem value={AnnotationFormat.COCO}>
                        COCO
                      </SelectItem>
                      <SelectItem value={AnnotationFormat.PASCAL_VOC}>
                        Pascal VOC
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Classes</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  placeholder="Add a class"
                  onKeyPress={(e) => e.key === "Enter" && handleAddClass()}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddClass}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {classes.map((cls) => (
                  <div
                    key={cls}
                    className="bg-secondary px-2 py-1 rounded-md flex items-center gap-2"
                  >
                    <span>{cls}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveClass(cls)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {form.formState.errors.classes && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.classes.message}
                </p>
              )}
            </div>

            <div className="pt-6 space-x-2 flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Project
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

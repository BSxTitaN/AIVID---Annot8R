// app/(admin)/components/projects/details/ProjectSettings.tsx
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project, AnnotationFormat } from "@/lib/types/project";
import { updateProject } from "@/lib/apis/projects";

const formSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  modelFormat: z.nativeEnum(AnnotationFormat),
  allowCustomClasses: z.boolean(),
  requireReview: z.boolean(),
  autoDistribute: z.boolean(),
  classes: z.string(), // Now expecting a comma-separated string
});

interface ProjectSettingsProps {
  project: Project;
  onUpdate: (project: Project) => void;
}

export function ProjectSettings({ project, onUpdate }: ProjectSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project.name,
      description: project.description || "",
      modelFormat: project.settings.modelFormat,
      allowCustomClasses: project.settings.allowCustomClasses,
      requireReview: project.settings.requireReview,
      autoDistribute: project.settings.autoDistribute,
      classes: project.classes.join(", "), // Join with comma and space
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    try {
      // Split the comma-separated classes string into an array
      const classesArray = values.classes
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const updateData = {
        name: values.name,
        description: values.description,
        settings: {
          modelFormat: values.modelFormat,
          allowCustomClasses: values.allowCustomClasses,
          requireReview: values.requireReview,
          autoDistribute: values.autoDistribute,
        },
        classes: classesArray,
      };

      const success = await updateProject(project.id, updateData);

      if (success) {
        // Create an updated project object to pass to onUpdate
        const updatedProject: Project = {
          ...project,
          name: values.name,
          description: values.description,
          settings: {
            ...project.settings,
            modelFormat: values.modelFormat,
            allowCustomClasses: values.allowCustomClasses,
            requireReview: values.requireReview,
            autoDistribute: values.autoDistribute,
          },
          classes: classesArray,
        };

        onUpdate(updatedProject);
        toast.success("Settings updated successfully");
      } else {
        throw new Error("Failed to update project");
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="classes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Annotation Classes</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Car, Truck, Pedestrian, Bicycle"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter classes separated by commas
                    </FormDescription>
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

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="allowCustomClasses"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Allow Custom Classes</FormLabel>
                        <FormDescription>
                          Let annotators add new classes during annotation
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

                <FormField
                  control={form.control}
                  name="requireReview"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Require Review</FormLabel>
                        <FormDescription>
                          Require admin review for completed annotations
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

                <FormField
                  control={form.control}
                  name="autoDistribute"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Auto-distribute Tasks</FormLabel>
                        <FormDescription>
                          Automatically distribute tasks based on allocation
                          percentages
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
              </div>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
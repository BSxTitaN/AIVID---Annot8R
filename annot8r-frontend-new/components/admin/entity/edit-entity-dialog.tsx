// components/entity/dialogs/EditEntityDialog.tsx
import { useState } from "react";
import { UserProfile, ApiResponse } from "@/lib/types";
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
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Schema for both users and admins
const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  isOfficeUser: z.boolean().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface EditEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: UserProfile;
  onEntityUpdated: () => void;
  entityType: "users" | "admins";
  updateEntity: (
    id: string,
    data: unknown
  ) => Promise<ApiResponse<UserProfile>>;
  title: string;
  description: string;
  submitLabel: string;
}

export function EditEntityDialog({
  open,
  onOpenChange,
  entity,
  onEntityUpdated,
  entityType,
  updateEntity,
  title,
  description,
  submitLabel,
}: EditEntityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      isOfficeUser: entity.isOfficeUser,
      isActive: entity.isActive,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // For admins, we don't send isOfficeUser
      const entityData =
        entityType === "admins"
          ? {
              email: values.email,
              firstName: values.firstName,
              lastName: values.lastName,
              isActive: values.isActive,
            }
          : values;

      const response = await updateEntity(entity.id, entityData);

      if (response.success) {
        onEntityUpdated();
      } else {
        setError(
          response.error ||
            `Failed to update ${
              entityType === "users" ? "user" : "administrator"
            }`
        );
        toast.error(
          `Failed to update ${
            entityType === "users" ? "user" : "administrator"
          }`,
          {
            description:
              response.error ||
              `An error occurred while updating the ${
                entityType === "users" ? "user" : "administrator"
              }.`,
          }
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error("Error", { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description.replace(
              "{name}",
              `${entity.firstName} ${entity.lastName}`
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 p-3 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {entityType === "users" && (
              <FormField
                control={form.control}
                name="isOfficeUser"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Office User</FormLabel>
                      <FormDescription>
                        Office users can use auto-annotation features.
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
            )}

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Inactive{" "}
                      {entityType === "users" ? "users" : "administrators"}{" "}
                      cannot log in to the platform.
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
                    Saving...
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

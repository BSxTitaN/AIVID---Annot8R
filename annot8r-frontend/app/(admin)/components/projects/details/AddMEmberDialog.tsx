import { useEffect, useState, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  addProjectMember,
  updateMemberAllocation,
  getAllUsers,
} from "@/lib/apis/projects";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ProjectMember } from "@/lib/types/project";

// Form schema for selecting a user
const userSelectionSchema = z.object({
  userId: z.string().min(1, "User is required"),
});

// Form schema for allocation
const allocationSchema = z.object({
  distributions: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      allocationPercentage: z.number().min(0).max(100),
    })
  ),
  smartDistribute: z.boolean().default(false),
});

type UserSelectionFormValues = z.infer<typeof userSelectionSchema>;
type AllocationFormValues = z.infer<typeof allocationSchema>;

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentMembers: ProjectMember[];
  onMembersUpdated: () => void;
}

interface User {
  username: string;
  isLocked: boolean;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  projectId,
  currentMembers,
  onMembersUpdated,
}: AddMemberDialogProps) {
  const [step, setStep] = useState<"select-user" | "allocate">("select-user");
  const [isLoading, setIsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [distributions, setDistributions] = useState<
    AllocationFormValues["distributions"]
  >([]);

  // Form for user selection
  const userSelectionForm = useForm<UserSelectionFormValues>({
    resolver: zodResolver(userSelectionSchema),
    defaultValues: {
      userId: "",
    },
  });

  // Form for allocation
  const allocationForm = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationSchema),
    defaultValues: {
      distributions: [],
      smartDistribute: true,
    },
  });

  // Load users that are not already project members
  const loadAvailableUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      // Use the API service to fetch all users
      const users = await getAllUsers();

      // Filter out users that are already project members
      const existingMemberIds = currentMembers.map((member) => member.userId);
      const filteredUsers = users.filter(
        (user: User) =>
          !existingMemberIds.includes(user.username) && !user.isLocked
      );

      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, [currentMembers]);

  // Handle smart distribution
  const handleSmartDistribute = useCallback(
    (customDistributions?: AllocationFormValues["distributions"]) => {
      const distributionsToUse =
        customDistributions || allocationForm.getValues().distributions;
      const memberCount = distributionsToUse.length;
      if (memberCount === 0) return;

      // Equal distribution among all members
      const equalPercentage = Math.floor(100 / memberCount);
      const remaining = 100 - equalPercentage * memberCount;

      // Create new distribution array with equal percentages
      const newDistributions = distributionsToUse.map((dist, index) => ({
        ...dist,
        allocationPercentage: equalPercentage + (index < remaining ? 1 : 0),
      }));

      // Update form
      setDistributions(newDistributions);
      allocationForm.setValue("distributions", newDistributions);
    },
    [allocationForm]
  );

  // Load available users when dialog opens
  useEffect(() => {
    if (open) {
      setStep("select-user");
      userSelectionForm.reset();
      allocationForm.reset({ distributions: [], smartDistribute: true });
      setSelectedUser(null);
      loadAvailableUsers();
    }
  }, [open, userSelectionForm, allocationForm, loadAvailableUsers]);

  // Prepare allocation data when user is selected
  useEffect(() => {
    if (selectedUser && step === "allocate") {
      // Create new distributions array with current members + new member
      const newDistributions = [
        ...currentMembers.map((member) => ({
          userId: member.userId,
          name: member.userId, // Use userId as name if we don't have actual names
          allocationPercentage: member.allocationPercentage,
        })),
        {
          userId: selectedUser,
          name: selectedUser, // Use userId as name if we don't have actual names
          allocationPercentage: 0, // Start with 0%
        },
      ];

      // Update form
      setDistributions(newDistributions);
      allocationForm.setValue("distributions", newDistributions);

      // If smart distribute is enabled, recalculate allocations
      if (allocationForm.getValues("smartDistribute")) {
        handleSmartDistribute(newDistributions);
      }
    }
  }, [
    selectedUser,
    step,
    currentMembers,
    allocationForm,
    handleSmartDistribute,
  ]);

  // Handle manual slider changes
  const handleSliderChange = useCallback(
    (userId: string, value: number[]) => {
      const newValue = value[0];

      // Get current distributions
      const currentDistributions = [
        ...allocationForm.getValues().distributions,
      ];

      // Find the distribution to update
      const indexToUpdate = currentDistributions.findIndex(
        (d) => d.userId === userId
      );
      if (indexToUpdate === -1) return;

      // Calculate difference to distribute among others
      const oldValue = currentDistributions[indexToUpdate].allocationPercentage;
      const difference = newValue - oldValue;

      if (difference === 0) return;

      // Update the selected distribution
      currentDistributions[indexToUpdate].allocationPercentage = newValue;

      // Adjust other distributions proportionally
      const otherDistributions = currentDistributions.filter(
        (_, i) => i !== indexToUpdate
      );
      const totalOtherPercentage = otherDistributions.reduce(
        (sum, dist) => sum + dist.allocationPercentage,
        0
      );

      if (totalOtherPercentage > 0) {
        // Adjust other distributions proportionally to maintain total of 100%
        otherDistributions.forEach((dist) => {
          const weight = dist.allocationPercentage / totalOtherPercentage;
          const newPercentage = Math.max(
            0,
            dist.allocationPercentage - difference * weight
          );
          const index = currentDistributions.findIndex(
            (d) => d.userId === dist.userId
          );
          if (index !== -1) {
            currentDistributions[index].allocationPercentage =
              Math.round(newPercentage);
          }
        });
      }

      // Ensure total is exactly 100%
      const total = currentDistributions.reduce(
        (sum, dist) => sum + dist.allocationPercentage,
        0
      );

      if (total !== 100) {
        // Find the distribution with the largest allocation and adjust it
        const indexToAdjust = currentDistributions
          .map((dist, i) => ({ value: dist.allocationPercentage, index: i }))
          .sort((a, b) => b.value - a.value)[0].index;

        currentDistributions[indexToAdjust].allocationPercentage += 100 - total;
      }

      // Update form
      setDistributions(currentDistributions);
      allocationForm.setValue("distributions", currentDistributions);
    },
    [allocationForm]
  );

  // Handle user selection submission
  const onUserSelectionSubmit = useCallback(
    (values: UserSelectionFormValues) => {
      setSelectedUser(values.userId);
      setStep("allocate");
    },
    []
  );

  // Handle allocation submission
  const onAllocationSubmit = useCallback(
    async (values: AllocationFormValues) => {
      if (!selectedUser) return;

      setIsLoading(true);
      try {
        // Prepare member allocations
        const memberAllocations = values.distributions.map((dist) => ({
          userId: dist.userId,
          allocationPercentage: dist.allocationPercentage,
        }));

        // Add the new member using the API service
        await addProjectMember(
          projectId,
          selectedUser,
          memberAllocations.find((m) => m.userId === selectedUser)
            ?.allocationPercentage || 0
        );

        // Update existing member allocations
        for (const member of currentMembers) {
          const newAllocation = memberAllocations.find(
            (m) => m.userId === member.userId
          );
          if (
            newAllocation &&
            newAllocation.allocationPercentage !== member.allocationPercentage
          ) {
            await updateMemberAllocation(
              projectId,
              member.userId,
              newAllocation.allocationPercentage
            );
          }
        }

        toast.success("Member added and allocations updated successfully");
        onMembersUpdated();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to add member:", error);
        toast.error("Failed to add member");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedUser, projectId, currentMembers, onMembersUpdated, onOpenChange]
  );

  // When smart distribute toggle changes
  const handleSmartDistributeToggle = useCallback(
    (checked: boolean) => {
      allocationForm.setValue("smartDistribute", checked);
      if (checked) {
        handleSmartDistribute();
      }
    },
    [allocationForm, handleSmartDistribute]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {step === "select-user" ? (
          <>
            <DialogHeader>
              <DialogTitle>Add Project Member</DialogTitle>
              <DialogDescription>
                Select a user to add to this project
              </DialogDescription>
            </DialogHeader>

            <Form {...userSelectionForm}>
              <form
                onSubmit={userSelectionForm.handleSubmit(onUserSelectionSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={userSelectionForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select User</FormLabel>
                      <Select
                        disabled={usersLoading}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                usersLoading
                                  ? "Loading users..."
                                  : "Select a user"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableUsers.map((user) => (
                            <SelectItem
                              key={user.username}
                              value={user.username}
                            >
                              {user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={usersLoading}>
                    {usersLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Next"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Distribute Task Allocation</DialogTitle>
              <DialogDescription>
                Adjust how work is distributed among team members
              </DialogDescription>
            </DialogHeader>

            <Form {...allocationForm}>
              <form
                onSubmit={allocationForm.handleSubmit(onAllocationSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={allocationForm.control}
                  name="smartDistribute"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Smart Distribution</FormLabel>
                        <FormDescription>
                          Automatically balance work between team members
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={handleSmartDistributeToggle}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Team Member</span>
                    <span>Allocation %</span>
                  </div>

                  {distributions.map((dist) => (
                    <div key={dist.userId} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {dist.userId === selectedUser
                            ? `${dist.name} (New)`
                            : dist.name}
                        </span>
                        <span className="font-medium text-primary">
                          {dist.allocationPercentage}%
                        </span>
                      </div>
                      <div className="flex gap-4 items-center">
                        <Slider
                          value={[dist.allocationPercentage]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(value) =>
                            handleSliderChange(dist.userId, value)
                          }
                          disabled={allocationForm.getValues("smartDistribute")}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={dist.allocationPercentage}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value)) {
                              handleSliderChange(dist.userId, [value]);
                            }
                          }}
                          disabled={allocationForm.getValues("smartDistribute")}
                          className="w-16"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("select-user")}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Allocations"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

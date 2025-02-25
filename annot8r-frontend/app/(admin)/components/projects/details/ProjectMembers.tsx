// app/(admin)/components/projects/details/ProjectMembers.tsx
import { useState, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { UserPlus, MoreVertical, BarChart, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Project } from "@/lib/types/project";
import { AddMemberDialog } from "./AddMEmberDialog";
import { removeProjectMember } from "@/lib/apis/projects";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectMembersProps {
  project: Project;
}

export function ProjectMembers({ project }: ProjectMembersProps) {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMembersUpdated = useCallback(() => {
    // Force refresh by incrementing the key
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleRemoveMember = useCallback(async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      await removeProjectMember(project.id, memberToRemove);
      toast.success("Member removed successfully");
      handleMembersUpdated();
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member");
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  }, [memberToRemove, project.id, handleMembersUpdated]);

  const getCompletionPercentage = (member: typeof project.members[0]) => {
    if (!member.assignedImages.length) return 0;
    return (member.completedImages.length / member.assignedImages.length) * 100 || 0;
  };

  // Calculate total allocation to ensure it adds up to 100%
  const totalAllocation = project.members.reduce(
    (sum, member) => sum + member.allocationPercentage, 
    0
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Project Members</h3>
            <p className="text-sm text-muted-foreground">
              Manage members and their task allocations
            </p>
          </div>
          <Button onClick={() => setIsAddMemberOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>

        {totalAllocation !== 100 && project.members.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <p className="flex items-center">
              <BarChart className="h-4 w-4 mr-2" />
              <span>
                Total allocation is {totalAllocation}%. For optimal task distribution, total should be 100%.
              </span>
            </p>
          </div>
        )}

        <div className="grid gap-4">
          {project.members.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-lg">
              <p className="text-muted-foreground">
                No members assigned to this project yet. Add members to begin assigning tasks.
              </p>
            </div>
          ) : (
            project.members.map((member) => (
              <Card key={`${member.userId}-${refreshKey}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>
                        {member.userId.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{member.userId}</CardTitle>
                      <CardDescription>
                        {member.lastActivity
                          ? `Last active ${formatDistanceToNow(member.lastActivity, {
                              addSuffix: true,
                            })}`
                          : "No recent activity"}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="text-red-600 cursor-pointer"
                        onClick={() => setMemberToRemove(member.userId)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span>Task Completion</span>
                        <span className="font-medium">
                          {member.completedImages.length} / {member.assignedImages.length} images
                        </span>
                      </div>
                      <span className="font-medium">
                        {Math.round(getCompletionPercentage(member))}%
                      </span>
                    </div>
                    <Progress value={getCompletionPercentage(member)} />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span className="font-medium text-primary">Allocation: {member.allocationPercentage}%</span>
                      <span>Time Spent: {member.timeSpent} minutes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <AddMemberDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        projectId={project.id}
        currentMembers={project.members}
        onMembersUpdated={handleMembersUpdated}
      />

      <AlertDialog open={!!memberToRemove} onOpenChange={(isOpen) => !isOpen && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the project? 
              Their unfinished tasks will be redistributed among remaining team members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveMember} 
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
import { useState, useEffect, useCallback } from "react";
import {
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  getAssignmentMetrics,
} from "@/lib/api/projects";
import { getUsers } from "@/lib/api/users";
import { ProjectMember, UserProfile, UserProgressMetric } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  UserPlus,
  Search,
  MoreVertical,
  UserMinus,
  RefreshCw,
  UserCog,
  ShieldCheck,
} from "lucide-react";

interface ProjectMembersProps {
  projectId: string;
}

// Extended project member interface to include progress data
interface ExtendedProjectMember extends ProjectMember {
  totalAssigned?: number;
  completedImages?: number;
  completionPercentage?: number;
  timeSpent?: number;
}

// Extended response type to handle different API response formats
interface ExtendedUserResponse {
  data?: UserProfile[];
  users?: UserProfile[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export function ProjectMembers({ projectId }: ProjectMembersProps) {
  const [members, setMembers] = useState<ExtendedProjectMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<
    ExtendedProjectMember[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userProgressMetrics, setUserProgressMetrics] = useState<
    Map<string, UserProgressMetric>
  >(new Map());
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("ANNOTATOR");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getProjectMembers(
        projectId,
        currentPage,
        pageSize
      );

      if (response.success && response.data) {
        // Store the members without adding random data
        setMembers(response.data.data);
        setFilteredMembers(response.data.data);
        setTotalPages(response.data.totalPages);
      } else {
        toast.error("Failed to load project members", {
          description: response.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error fetching project members:", error);
      toast.error("Error loading members", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, projectId, pageSize]);

  const fetchAvailableUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await getUsers(1, 50);
      if (response.success && response.data) {
        const memberUserIds = new Set(members.map((member) => member.userId));
        let availableUsers: UserProfile[] = [];
        const data = response.data as ExtendedUserResponse;

        if (Array.isArray(data)) {
          availableUsers = data.filter(
            (user: UserProfile) => !memberUserIds.has(user.id)
          );
        } else if (data.data && Array.isArray(data.data)) {
          availableUsers = data.data.filter(
            (user: UserProfile) => !memberUserIds.has(user.id)
          );
        } else if (data.users && Array.isArray(data.users)) {
          availableUsers = data.users.filter(
            (user: UserProfile) => !memberUserIds.has(user.id)
          );
        }
        setUsers(availableUsers);
        if (availableUsers.length > 0) {
          setSelectedUserId(availableUsers[0].id);
        }
      } else {
        toast.error("Failed to load users", {
          description: response.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error loading users", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchAssignmentMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const response = await getAssignmentMetrics(projectId);
      if (response.success && response.data) {
        // Create a map of user ID to progress metric for quick lookups
        const progressMap = new Map<string, UserProgressMetric>();
        response.data.userProgress.forEach((metric) => {
          progressMap.set(metric.userId, metric);
        });
        setUserProgressMetrics(progressMap);
      } else {
        console.error("Failed to load assignment metrics:", response.error);
      }
    } catch (error) {
      console.error("Error fetching assignment metrics:", error);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMembers();
  }, [projectId, currentPage, fetchMembers]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = members.filter(
      (member) =>
        member.username.toLowerCase().includes(query) ||
        `${member.firstName} ${member.lastName}`
          .toLowerCase()
          .includes(query) ||
        member.role.toLowerCase().includes(query)
    );
    setFilteredMembers(filtered);
  }, [searchQuery, members]);

  useEffect(() => {
    if (!isLoading) {
      fetchAssignmentMetrics();
    }
  }, [fetchAssignmentMetrics, currentPage, isLoading]);

  // Format time in hours and minutes
  const formatTime = (seconds: number): string => {
    if (!seconds) return "0m";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Functions for member management
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleOpenAddDialog = () => {
    fetchAvailableUsers();
    setIsAddDialogOpen(true);
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await addProjectMember(projectId, {
        userId: selectedUserId,
        role: selectedRole,
      });
      if (response.success) {
        toast.success("Member added successfully");
        fetchMembers();
        setIsAddDialogOpen(false);
        setSelectedUserId("");
        setSelectedRole("ANNOTATOR");
      } else {
        toast.error("Failed to add member", {
          description: response.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Error adding member", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await removeProjectMember(projectId, memberId);
      if (response.success) {
        toast.success("Member removed successfully");
        fetchMembers();
      } else {
        toast.error("Failed to remove member", {
          description: response.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Error removing member", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
      return format(new Date(dateString), "PPP");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="py-5 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Project Members</CardTitle>
            <CardDescription>
              Manage annotators and reviewers for this project
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAddDialog}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Project Member</DialogTitle>
                  <DialogDescription>
                    Add a user to this project as an annotator or reviewer
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Select
                      value={selectedUserId}
                      onValueChange={setSelectedUserId}
                      disabled={isLoadingUsers || users.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingUsers ? (
                          <div className="p-2 text-center">
                            Loading users...
                          </div>
                        ) : users.length === 0 ? (
                          <div className="p-2 text-center">
                            No available users
                          </div>
                        ) : (
                          users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.username})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANNOTATOR">Annotator</SelectItem>
                        <SelectItem value="REVIEWER">Reviewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="font-medium">Annotator:</span> Can
                      annotate assigned images
                      <br />
                      <span className="font-medium">Reviewer:</span> Can review
                      annotations submitted by annotators
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddMember}
                    disabled={isSubmitting || !selectedUserId}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Member"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[240px]"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="icon"
                className="shrink-0"
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <UserMinus className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No members found</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {members.length === 0
                  ? "This project doesn't have any members yet. Add members to start collaborating."
                  : "No members matching your search criteria."}
              </p>
              {members.length === 0 && (
                <Button onClick={handleOpenAddDialog} className="mt-4">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Member
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>
                            {member.firstName} {member.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            @{member.username}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.role === "ANNOTATOR"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {member.role === "ANNOTATOR" && (
                            <UserCog className="h-3 w-3 mr-1" />
                          )}
                          {member.role === "REVIEWER" && (
                            <ShieldCheck className="h-3 w-3 mr-1" />
                          )}
                          {member.role === "ANNOTATOR"
                            ? "Annotator"
                            : "Reviewer"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(member.addedAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.isOfficeUser ? "outline" : "secondary"
                          }
                          className="font-normal"
                        >
                          {member.isOfficeUser ? "Office User" : "Regular User"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isLoadingMetrics && member.role === "ANNOTATOR" ? (
                          <div className="space-y-2">
                            <Skeleton className="h-2 w-full" />
                            <Skeleton className="h-2 w-3/4" />
                          </div>
                        ) : member.role === "ANNOTATOR" ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs">
                              <span>
                                Images:{" "}
                                {userProgressMetrics.get(member.userId)
                                  ?.totalAssigned || 0}
                              </span>
                              <span>
                                {userProgressMetrics.get(member.userId)
                                  ?.progress || 0}
                                %
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${
                                    userProgressMetrics.get(member.userId)
                                      ?.progress || 0
                                  }%`,
                                }}
                              ></div>
                            </div>
                            {userProgressMetrics.get(member.userId)
                              ?.timeSpent !== undefined && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Time spent:{" "}
                                {formatTime(
                                  userProgressMetrics.get(member.userId)
                                    ?.timeSpent || 0
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground italic">
                            Reviewer (no annotation tasks)
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              aria-label="Open menu"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                              onClick={() => handleRemoveMember(member.userId)}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col space-y-4 sm:flex-row sm:justify-between sm:space-y-0 bg-muted/40 border-t px-6 py-4">
          <div className="text-sm">
            <h3 className="font-medium">Member Roles</h3>
            <p className="text-muted-foreground mt-1">
              <span className="inline-flex items-center">
                <UserCog className="h-3.5 w-3.5 mr-1 text-primary" />
                <strong>Annotators</strong>
              </span>{" "}
              can annotate images assigned to them.{" "}
              <span className="inline-flex items-center">
                <ShieldCheck className="h-3.5 w-3.5 mr-1 text-primary" />
                <strong>Reviewers</strong>
              </span>{" "}
              can review and approve annotations.
            </p>
          </div>
          <Button
            variant="outline"
            className="flex-shrink-0"
            onClick={handleOpenAddDialog}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </CardFooter>
      </Card>

      {/* Remove the Image Assignment Dialog - it's now only in the Image tab */}
    </div>
  );
}

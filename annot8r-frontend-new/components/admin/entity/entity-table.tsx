// components/entity/EntityTable.tsx
import { UserProfile, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import {
  MoreHorizontal,
  Edit,
  Key,
  Trash,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  User,
  UserCog,
  Shield,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface EntityTableProps {
  entities: UserProfile[];
  entityType: "users" | "admins";
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (entity: UserProfile) => void;
  onResetPassword: (entity: UserProfile) => void;
  onDelete: (entity: UserProfile) => void;
  isRefreshing?: boolean;
}

export function EntityTable({
  entities,
  entityType,
  currentPage,
  totalPages,
  onPageChange,
  onEdit,
  onResetPassword,
  onDelete,
  isRefreshing = false,
}: EntityTableProps) {
  // Get entity initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className={`space-y-4 ${isRefreshing ? "opacity-70" : ""}`}>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[120px]">
                {entityType === "users" ? "Office User" : "Role"}
              </TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[180px]">Last Login</TableHead>
              <TableHead className="w-[80px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  No {entityType} found matching the current criteria
                </TableCell>
              </TableRow>
            ) : (
              entities.map((entity: UserProfile) => (
                <TableRow key={entity.id} className="group hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 font-semibold">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(entity.firstName, entity.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {entity.firstName} {entity.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          @{entity.username}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entity.email}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            {entityType === "admins" &&
                            entity.role === UserRole.SUPER_ADMIN ? (
                              <Badge
                                variant="default"
                                className="bg-blue-500 hover:bg-blue-600"
                              >
                                <Shield className="mr-1 h-3 w-3" />
                                Super Admin
                              </Badge>
                            ) : entityType === "admins" ? (
                              <Badge variant="secondary">
                                <UserCog className="mr-1 h-3 w-3" />
                                Admin
                              </Badge>
                            ) : entity.isOfficeUser ? (
                              <Badge
                                variant="default"
                                className="bg-blue-500 hover:bg-blue-600"
                              >
                                <UserCog className="mr-1 h-3 w-3" />
                                Office
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground"
                              >
                                <User className="mr-1 h-3 w-3" />
                                Standard
                              </Badge>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {entityType === "admins" &&
                          entity.role === UserRole.SUPER_ADMIN
                            ? "Super administrators have full system access"
                            : entityType === "admins"
                            ? "Regular administrators with platform management access"
                            : entity.isOfficeUser
                            ? "Office users can use auto-annotation features"
                            : "Regular user without auto-annotation access"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    {entity.isActive ? (
                      <div className="flex items-center">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <XCircle className="mr-2 h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">Inactive</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {entity.lastLoginAt ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm">
                              {formatDistanceToNow(
                                new Date(entity.lastLoginAt),
                                {
                                  addSuffix: true,
                                }
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {format(new Date(entity.lastLoginAt), "PPpp")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Never
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px]">
                        <DropdownMenuLabel>
                          {entityType === "users" ? "User" : "Admin"} Actions
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => onEdit(entity)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                          <span>
                            Edit {entityType === "users" ? "User" : "Admin"}
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onResetPassword(entity)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Key className="h-4 w-4" />
                          <span>Reset Password</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(entity)}
                          className="text-destructive flex items-center gap-2 cursor-pointer"
                          disabled={
                            entityType === "admins" &&
                            entity.role === UserRole.SUPER_ADMIN
                          }
                        >
                          <Trash className="h-4 w-4" />
                          <span>
                            Delete {entityType === "users" ? "User" : "Admin"}
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <div className="text-sm font-medium">{currentPage}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

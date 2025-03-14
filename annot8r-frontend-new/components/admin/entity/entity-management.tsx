// components/entity/EntityManagement.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { UserProfile, ApiResponse, PaginatedResponse } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { LucideIcon, Plus, Search, Filter, RefreshCw } from "lucide-react";
import { EntitySkeletonLoader } from "./entity-skeleton-loader";
import { EntityErrorState } from "./entity-error-card";
import { EntityEmptyState } from "./entity-empty-card";
import { EntityTable } from "./entity-table";
import { EntityStatCards } from "./entity-state-card";
import { CreateEntityDialog } from "./create-entity-dialog";
import { EditEntityDialog } from "./edit-entity-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";

// Filter options for tabs
type FilterOption = "all" | "active" | "inactive" | "office";

export type EntityTabConfig = {
  id: FilterOption;
  label: string;
  icon?: LucideIcon;
  filter: (entity: UserProfile) => boolean;
};

export interface EntityManagementProps {
  // Configuration
  entityType: "users" | "admins";
  title: string;
  description: string;
  icon: LucideIcon;
  singularName: string;
  pluralName: string;

  // API Functions renamed to follow server action naming convention
  fetchEntitiesAction: (
    page: number,
    limit: number
  ) => Promise<ApiResponse<PaginatedResponse<UserProfile>>>;
  createEntityAction: (data: unknown) => Promise<ApiResponse<UserProfile>>;
  updateEntityAction: (
    id: string,
    data: unknown
  ) => Promise<ApiResponse<UserProfile>>;
  deleteEntityAction: (id: string) => Promise<ApiResponse<null>>;
  resetPasswordAction: (
    id: string,
    newPassword: string
  ) => Promise<ApiResponse<null>>;

  // Tab Configuration
  tabConfig: EntityTabConfig[];

  // Dialog configurations
  createDialogProps: {
    title: string;
    description: string;
    submitLabel: string;
  };

  editDialogProps: {
    title: string;
    description: string;
    submitLabel: string;
  };

  resetPasswordDialogProps: {
    title: string;
    description: string;
  };

  deleteDialogProps: {
    title: string;
    description: string;
  };
}

export function EntityManagement({
  entityType,
  title,
  description,
  icon: Icon,
  singularName,
  pluralName,
  fetchEntitiesAction,
  createEntityAction,
  updateEntityAction,
  deleteEntityAction,
  resetPasswordAction,
  tabConfig,
  createDialogProps,
  editDialogProps,
  resetPasswordDialogProps,
  deleteDialogProps,
}: EntityManagementProps) {
  // State for all loaded entities and filtered entities
  const [allEntities, setAllEntities] = useState<UserProfile[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<UserProfile | null>(
    null
  );

  // Function to fetch all entities - only called on initial load and manual refresh
  const fetchAllEntities = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        console.log(`Fetching ${entityType} with fetchEntitiesAction...`);
        const response = await fetchEntitiesAction(1, 500);
        console.log(`${entityType} API response:`, response);

        // Process different response structures
        let entityData: UserProfile[] = [];

        if (response && response.success && response.data) {
          // Case 1: Standard ApiResponse with data property
          if (response.data.data && Array.isArray(response.data.data)) {
            entityData = response.data.data;
          }
          // Case 2: Data is an array directly
          else if (Array.isArray(response.data)) {
            entityData = response.data;
          }
          // Case 3: Data property contains the users/admins array
          else if (
            typeof response.data === "object" &&
            response.data !== null
          ) {
            if ("data" in response.data && Array.isArray(response.data.data)) {
              entityData = response.data.data as UserProfile[];
            }
            // Case 4: Users/admins are directly in the data object with some key
            else {
              const possibleArrays = Object.values(response.data).filter(
                (value) => Array.isArray(value)
              );
              if (possibleArrays.length > 0) {
                // Use the first array found
                entityData = possibleArrays[0] as UserProfile[];
              }
            }
          }
        }
        // Case 5: Response itself is an array
        else if (Array.isArray(response)) {
          entityData = response as UserProfile[];
        }

        console.log(`Processed ${entityType} data:`, entityData);

        if (entityData.length > 0) {
          setAllEntities(entityData);
        } else {
          const errorMsg =
            response?.error || `Failed to fetch ${pluralName}: No data found`;
          console.error("API error:", errorMsg);
          setError(errorMsg);
          toast.error(`Failed to load ${pluralName}`, {
            description: errorMsg,
          });
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        console.error(`Exception while fetching ${pluralName}:`, err);
        setError(errorMessage);
        toast.error("Error", { description: errorMessage });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [entityType, fetchEntitiesAction, pluralName]
  );

  // Initial data load
  useEffect(() => {
    fetchAllEntities();
  }, [fetchAllEntities]);

  // Function to apply filters to the allEntities dataset
  const applyFilters = useCallback(() => {
    if (allEntities.length === 0) return;

    let filtered = [...allEntities];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (entity) =>
          entity.username.toLowerCase().includes(query) ||
          entity.email.toLowerCase().includes(query) ||
          entity.firstName.toLowerCase().includes(query) ||
          entity.lastName.toLowerCase().includes(query)
      );
    }

    // Apply tab filter using the provided tab configuration
    const activeTab = tabConfig.find((tab) => tab.id === filterOption);
    if (activeTab) {
      filtered = filtered.filter(activeTab.filter);
    }

    // Calculate pagination
    const totalFilteredEntities = filtered.length;
    const totalFilteredPages = Math.ceil(totalFilteredEntities / pageSize);

    // Ensure current page is valid
    const validCurrentPage = Math.min(
      Math.max(1, currentPage),
      Math.max(1, totalFilteredPages)
    );

    if (validCurrentPage !== currentPage) {
      setCurrentPage(validCurrentPage);
      return; // Exit as the useEffect will trigger again with the corrected page
    }

    // Apply pagination
    const startIndex = (validCurrentPage - 1) * pageSize;
    const paginatedEntities = filtered.slice(startIndex, startIndex + pageSize);

    // Update state
    setFilteredEntities(paginatedEntities);
    setTotalPages(totalFilteredPages);
  }, [
    allEntities,
    searchQuery,
    filterOption,
    currentPage,
    pageSize,
    tabConfig,
  ]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [allEntities, searchQuery, filterOption, currentPage, applyFilters]);

  // Derived stats
  const activeEntities = useMemo(
    () => allEntities.filter((entity) => entity.isActive).length,
    [allEntities]
  );

  const inactiveEntities = useMemo(
    () => allEntities.filter((entity) => !entity.isActive).length,
    [allEntities]
  );

  const officeEntities = useMemo(
    () => allEntities.filter((entity) => entity.isOfficeUser).length,
    [allEntities]
  );

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when applying new search
  };

  // Handle manual refresh - this will make an API call
  const handleRefresh = () => {
    fetchAllEntities(true);
    toast.success(`Refreshing ${pluralName} data`);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Dialog handlers
  const handleOpenCreateDialog = () => setCreateDialogOpen(true);
  const handleOpenEditDialog = (entity: UserProfile) => {
    setSelectedEntity(entity);
    setEditDialogOpen(true);
  };
  const handleOpenResetPasswordDialog = (entity: UserProfile) => {
    setSelectedEntity(entity);
    setResetPasswordDialogOpen(true);
  };
  const handleOpenDeleteDialog = (entity: UserProfile) => {
    setSelectedEntity(entity);
    setDeleteDialogOpen(true);
  };

  // Handle entity deletion
  const handleDeleteEntity = async () => {
    if (!selectedEntity) return;

    try {
      const response = await deleteEntityAction(selectedEntity.id);

      if (response.success) {
        toast.success(`${singularName} deleted`, {
          description: `${selectedEntity.firstName} ${selectedEntity.lastName} has been deleted successfully.`,
        });
        // Refresh data after deletion
        fetchAllEntities(true);
      } else {
        toast.error(`Failed to delete ${singularName.toLowerCase()}`, {
          description:
            response.error ||
            `An error occurred while deleting the ${singularName.toLowerCase()}.`,
        });
      }
    } catch (err) {
      toast.error("Error", {
        description:
          err instanceof Error ? err.message : "An unexpected error occurred",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  // Success handlers
  const handleEntityCreated = () => {
    setCreateDialogOpen(false);
    fetchAllEntities(true);
    toast.success(`${singularName} created`, {
      description: `New ${singularName.toLowerCase()} has been created successfully.`,
    });
  };

  const handleEntityUpdated = () => {
    setEditDialogOpen(false);
    fetchAllEntities(true);
    toast.success(`${singularName} updated`, {
      description: `${singularName} information has been updated successfully.`,
    });
  };

  const handlePasswordReset = () => {
    setResetPasswordDialogOpen(false);
    toast.success("Password reset", {
      description: `The ${singularName.toLowerCase()}'s password has been reset successfully.`,
    });
  };

  // Helper function to render the appropriate content based on state
  const renderTableContent = () => {
    if (isLoading && !isRefreshing) {
      return <EntitySkeletonLoader entityType={entityType} />;
    }

    if (error) {
      return (
        <EntityErrorState
          error={error}
          onRetry={() => fetchAllEntities(true)}
          entityType={entityType}
        />
      );
    }

    if (filteredEntities.length === 0) {
      return (
        <EntityEmptyState
          onCreateEntity={handleOpenCreateDialog}
          entityType={entityType}
          singularName={singularName}
        />
      );
    }

    return (
      <EntityTable
        entities={filteredEntities}
        entityType={entityType}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onEdit={handleOpenEditDialog}
        onResetPassword={handleOpenResetPasswordDialog}
        onDelete={handleOpenDeleteDialog}
        isRefreshing={isRefreshing}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Entity statistics cards */}
      <EntityStatCards
        entityType={entityType}
        totalEntities={allEntities.length}
        activeEntities={activeEntities}
        inactiveEntities={inactiveEntities}
        officeEntities={officeEntities}
      />

      <Card>
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription className="mt-1.5">
                {description}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={`Search ${pluralName.toLowerCase()}...`}
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
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Search</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="shrink-0"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  <span className="sr-only">Refresh</span>
                </Button>
              </form>
              <Button onClick={handleOpenCreateDialog} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" /> Add {singularName}
              </Button>
            </div>
          </div>
        </CardHeader>

        <Tabs
          defaultValue="all"
          value={filterOption}
          onValueChange={(v) => setFilterOption(v as FilterOption)}
        >
          <div className="px-6 mb-4">
            <TabsList className="h-12 p-1 bg-muted/30">
              {tabConfig.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    {tab.icon && <tab.icon className="h-4 w-4" />}
                    <span>{tab.label}</span>
                    <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                      {tab.id === "all" && allEntities.length}
                      {tab.id === "active" && activeEntities}
                      {tab.id === "inactive" && inactiveEntities}
                      {tab.id === "office" && officeEntities}
                    </span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <CardContent className="p-6 pt-4">
            {tabConfig.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-2">
                {renderTableContent()}
              </TabsContent>
            ))}
          </CardContent>
        </Tabs>
      </Card>

      {/* Dialogs */}
      <CreateEntityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onEntityCreated={handleEntityCreated}
        entityType={entityType}
        createEntity={createEntityAction}
        {...createDialogProps}
      />

      {selectedEntity && (
        <>
          <EditEntityDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            entity={selectedEntity}
            onEntityUpdated={handleEntityUpdated}
            entityType={entityType}
            updateEntity={updateEntityAction}
            {...editDialogProps}
          />

          <ResetPasswordDialog
            open={resetPasswordDialogOpen}
            onOpenChange={setResetPasswordDialogOpen}
            entityId={selectedEntity.id}
            entityName={`${selectedEntity.firstName} ${selectedEntity.lastName}`}
            onPasswordReset={handlePasswordReset}
            resetPassword={resetPasswordAction}
            {...resetPasswordDialogProps}
          />

          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{deleteDialogProps.title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteDialogProps.description.replace(
                    "{name}",
                    `${selectedEntity.firstName} ${selectedEntity.lastName}`
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteEntity}>
                  Delete {singularName}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

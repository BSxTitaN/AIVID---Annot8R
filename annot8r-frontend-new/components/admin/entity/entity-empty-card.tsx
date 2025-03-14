// components/entity/EntityEmptyState.tsx
import { Button } from "@/components/ui/button";
import { UsersIcon, Shield, Plus } from "lucide-react";

interface EntityEmptyStateProps {
  onCreateEntity: () => void;
  entityType: "users" | "admins";
  singularName: string;
}

export function EntityEmptyState({
  onCreateEntity,
  entityType,
  singularName,
}: EntityEmptyStateProps) {
  const isAdmins = entityType === "admins";

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        {isAdmins ? (
          <Shield className="h-10 w-10 text-muted-foreground" />
        ) : (
          <UsersIcon className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-semibold mb-2">No {entityType} found</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        There are no {entityType} that match your current filters. Try adjusting
        your search or create a new {singularName.toLowerCase()}.
      </p>
      <Button onClick={onCreateEntity}>
        <Plus className="mr-2 h-4 w-4" /> Add Your First {singularName}
      </Button>
    </div>
  );
}

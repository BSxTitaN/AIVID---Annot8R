// app/(admin)/components/admins/AdminToolbar.tsx
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminToolbarProps {
  onCreateAdmin: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function AdminToolbar({
  onCreateAdmin,
  searchQuery,
  onSearchChange,
}: AdminToolbarProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-4">
        <Input
          placeholder="Search admins..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-[300px]"
        />
      </div>
      <Button onClick={onCreateAdmin}>
        <Shield className="mr-2 h-4 w-4" />
        Create Admin
      </Button>
    </div>
  );
}

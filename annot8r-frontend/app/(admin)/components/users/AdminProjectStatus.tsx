// app/(admin)/components/users/AdminProjectStatus.tsx
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { unmarkProject } from "@/lib/apis/projects";
import { format } from "date-fns";

interface AdminProjectStatusProps {
  username: string;
  projectId: string;
  isSubmitted: boolean;
  submittedAt?: string;
  onStatusChange: () => void;
}

export function AdminProjectStatus({
  projectId,
  isSubmitted,
  submittedAt,
  onStatusChange,
}: AdminProjectStatusProps) {
  const [loading, setLoading] = useState(false);

  const handleUnmark = async () => {
    try {
      setLoading(true);
      await unmarkProject(projectId);
      toast.success("Project unmarked successfully");
      onStatusChange();
    } catch {
      toast.error("Failed to unmark project");
    } finally {
      setLoading(false);
    }
  };

  if (!isSubmitted) {
    return (
      <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
        <XCircle className="h-5 w-5 text-gray-500" />
        <span className="text-gray-600">Project not submitted</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <span className="font-medium text-green-800">Project submitted</span>
          {submittedAt && (
            <span className="ml-2 text-sm text-green-600">
              on {format(new Date(submittedAt), "PP")}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleUnmark}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Unmarking...
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4" />
            Unmark Submission
          </>
        )}
      </Button>
    </div>
  );
}
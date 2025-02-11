import { Clock, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface LastUpdatedProps {
  timestamp: Date;
  onRefresh: () => void;
}

export function LastUpdated({ timestamp, onRefresh }: LastUpdatedProps) {
  const [formattedTime, setFormattedTime] = useState("");

  useEffect(() => {
    // Format time in 12-hour format with uppercase AM/PM
    const formatTime = (date: Date) => {
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(date);
    };

    setFormattedTime(formatTime(timestamp));
  }, [timestamp]);

  if (!formattedTime) return null; // Prevent hydration mismatch by not rendering until client-side

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        <Clock className="h-4 w-4" />
        Last updated: {formattedTime}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        className="flex items-center gap-1"
      >
        <RotateCw className="h-4 w-4" />
        Refresh
      </Button>
    </div>
  );
}

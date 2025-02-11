import { ActivityLogEntry } from "@/lib/types/users";

interface ActivityInfoProps {
  activities: ActivityLogEntry[];
}

export function ActivityInfo({ activities }: ActivityInfoProps) {
  if (activities.length === 0) {
    return <span className="text-muted-foreground text-sm">No activity</span>;
  }

  const latestActivity = activities[0];
  return (
    <div className="text-sm">
      <p>{latestActivity.action}</p>
      <p className="text-muted-foreground text-xs">
        {new Date(latestActivity.timestamp).toLocaleString()}
      </p>
    </div>
  );
}

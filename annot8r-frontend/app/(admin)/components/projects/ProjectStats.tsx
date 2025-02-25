// app/(admin)/components/projects/ProjectStats.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Folder, Image as ImageIcon, CheckCircle } from "lucide-react";

interface ProjectStatsProps {
  loading: boolean;
  error: string | null;
  stats: {
    total: number;
    active: number;
    completed: number;
    totalImages: number;
    completedAnnotations: number;
    reviewPending: number;
  };
}

export function ProjectStats({ loading, error, stats }: ProjectStatsProps) {
  if (loading) {
    return (
      <>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-lg" />
        ))}
      </>
    );
  }

  if (error) {
    return (
      <div className="col-span-full p-4 bg-red-50 text-red-700 rounded-lg">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Projects",
      value: stats.total,
      icon: Folder,
      description: `${stats.active} active, ${stats.completed} completed`
    },
    {
      title: "Total Images",
      value: stats.totalImages,
      icon: ImageIcon,
      description: "Across all projects"
    },
    {
      title: "Completed Annotations",
      value: stats.completedAnnotations,
      icon: CheckCircle,
      description: `${stats.reviewPending} pending review`
    }
  ];

  return (
    <>
      {statCards.map((stat, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
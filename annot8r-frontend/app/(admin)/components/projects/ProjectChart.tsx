// app/(admin)/components/projects/ProjectsChart.tsx
"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Project } from "@/lib/types/project";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectsChartProps {
  loading: boolean;
  projects: Project[];
}

export function ProjectsChart({ loading, projects }: ProjectsChartProps) {
  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayStats = projects.reduce((acc, project) => {
        // Count annotations completed on this date
        const completedToday = project.stats.completedImages;
        const approvedToday = project.stats.approvedImages;

        return {
          completed: acc.completed + completedToday,
          approved: acc.approved + approvedToday
        };
      }, { completed: 0, approved: 0 });

      return {
        date,
        completed: dayStats.completed,
        approved: dayStats.approved
      };
    });
  }, [projects]);

  if (loading) {
    return <Skeleton className="h-[350px] w-full" />;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => new Date(value).toLocaleDateString()} 
        />
        <YAxis />
        <Tooltip 
          labelFormatter={(value) => new Date(value).toLocaleDateString()}
        />
        <Line 
          type="monotone" 
          dataKey="completed" 
          stroke="#2563eb" 
          name="Completed"
        />
        <Line 
          type="monotone" 
          dataKey="approved" 
          stroke="#16a34a" 
          name="Approved"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
// components/admin/dashboard/completion-chart.tsx
"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface CompletionChartProps {
  data: {
    totalImages: number;
    annotatedImages: number;
    reviewedImages: number;
    approvedImages: number;
  };
  isLoading: boolean;
}

export function CompletionChart({ data, isLoading }: CompletionChartProps) {
  const chartData = [
    {
      name: "Total",
      value: data.totalImages,
      fill: "#94a3b8", // slate-400
    },
    {
      name: "Annotated",
      value: data.annotatedImages,
      fill: "#60a5fa", // blue-400
    },
    {
      name: "Reviewed",
      value: data.reviewedImages,
      fill: "#fbbf24", // amber-400
    },
    {
      name: "Approved",
      value: data.approvedImages,
      fill: "#4ade80", // green-400
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>Annotation Progress</CardTitle>
        <CardDescription>Overview of image annotation status</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading ? (
          <div className="flex flex-col h-full space-y-4 justify-center">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-40" />
            <Skeleton className="w-full h-4" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
              barSize={40}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  border: "none",
                }}
                cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                formatter={(value: number) => [`${value} images`, "Count"]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
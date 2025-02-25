// app/(admin)/admin/projects/page.tsx
"use client";

import { useState } from "react";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectsOverview } from "../../components/projects/ProjectOverview";
import { ProjectsList } from "../../components/projects/ProjectList";
import { CreateProjectDialog } from "../../components/projects/CreateProjectDialog";

export default function AdminProjectsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Project
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="list">All Projects</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProjectsOverview />
        </TabsContent>

        <TabsContent value="list">
          <ProjectsList />
        </TabsContent>

        <TabsContent value="archive">
          <ProjectsList showArchived />
        </TabsContent>
      </Tabs>

      <CreateProjectDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </div>
  );
}
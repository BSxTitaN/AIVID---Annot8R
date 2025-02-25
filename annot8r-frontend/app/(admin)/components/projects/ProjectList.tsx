// app/(admin)/components/projects/ProjectList.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllProjects } from "@/lib/apis/projects";
import type { Project } from "@/lib/types/project";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "./ProjectCard";
import { toast } from "sonner";

interface ProjectsListProps {
  showArchived?: boolean;
}

export function ProjectsList({ showArchived = false }: ProjectsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("lastActivity");

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const data = await getAllProjects();
        
        // Log what we get from the API to debug
        console.log("Projects from API:", data);
        
        setProjects(data.projects);
      } catch (err) {
        console.error("Failed to load projects:", err);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [showArchived]);

  // Filter and sort projects
  const filteredProjects = projects
    .filter(p => {
      // Filter by status (archived or not)
      const statusMatch = showArchived 
        ? p.status === 'archived' 
        : p.status !== 'archived';
      
      // Filter by search query
      const searchMatch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return statusMatch && searchMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "createdAt":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "lastActivity":
          return new Date(b.stats.lastActivity).getTime() - new Date(a.stats.lastActivity).getTime();
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[200px] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={sortBy}
          onValueChange={setSortBy}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Created Date</SelectItem>
            <SelectItem value="lastActivity">Last Activity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <p className="text-muted-foreground">
            {searchQuery 
              ? "No projects found matching your search" 
              : showArchived 
                ? "No archived projects found" 
                : "No active projects found"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => router.push(`/admin/projects/${project.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
// lib/apis/projects.ts
import { fetchWithAuth } from "./config";
import type {
  Project,
  AssignedProject,
  ImageAssignment,
  ProjectMember,
  AnnotationFormat,
  ProjectStatus,
} from "../types/project";

// Get assigned projects (for regular users)
export async function getAssignedProjects(userId: string): Promise<AssignedProject[]> {
  const response = await fetchWithAuth(`/users/${userId}/projects`);
  return response.projects;
}

// Get all projects (for admins)
export async function getAllProjects(username?: string): Promise<{projects: Project[]}> {
  // If username is provided, get projects for that user
  if (username) {
    const response = await fetchWithAuth(`/users/${username}/projects`);
    return response;
  }
  // Otherwise get all projects (admin view)
  const response = await fetchWithAuth("/projects");
  return response;
}

// Create new project
export async function createProject(
  projectData: {
    name: string;
    description?: string;
    settings: {
      modelFormat: AnnotationFormat;
      allowCustomClasses: boolean;
      requireReview: boolean;
      autoDistribute: boolean;
    };
    classes: string[];
    status: ProjectStatus;
    totalImages: number;
    members: ProjectMember[];
  }
): Promise<string> {
  const response = await fetchWithAuth("/projects", {
    method: "POST",
    body: JSON.stringify(projectData),
  });

  if (!response.success) {
    console.error("Project creation error:", response.error);
    throw new Error(response.error?.message || "Failed to create project");
  }

  return response.projectId;
}

// Get project details
export async function getProjectDetails(projectId: string): Promise<Project> {
  try {
    console.log(`Fetching project details for ID: ${projectId}`);
    const response = await fetchWithAuth(`/projects/${projectId}`);

    // Log the raw response for debugging
    console.log("Raw project details response:", response);

    if (!response.success) {
      throw new Error(response.error || "Failed to fetch project details");
    }

    // Ensure dates are properly converted to Date objects
    const project = response.project;

    if (project) {
      // Convert string dates to Date objects where needed
      if (typeof project.createdAt === "string") {
        project.createdAt = new Date(project.createdAt);
      }

      if (typeof project.stats?.lastActivity === "string") {
        project.stats.lastActivity = new Date(project.stats.lastActivity);
      }

      // Process member dates if they exist
      if (project.members) {
        project.members = project.members.map((member: ProjectMember) => ({
          ...member,
          lastActivity: member.lastActivity
            ? new Date(member.lastActivity)
            : undefined,
        }));
      }
    }

    return project;
  } catch (error) {
    console.error("Error in getProjectDetails:", error);
    throw error;
  }
}

// Update project
export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<boolean> {
  const response = await fetchWithAuth(`/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return response.success;
}

// Add project member
export async function addProjectMember(
  projectId: string,
  userId: string,
  allocationPercentage: number
): Promise<boolean> {
  const response = await fetchWithAuth(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({
      userId,
      allocationPercentage,
      redistributeTasks: true, // Add this flag to enable task redistribution
    }),
  });

  if (!response.success) {
    console.error("Failed to add project member:", response.error);
    throw new Error(response.error || "Failed to add project member");
  }

  return response.success;
}

// Update member allocation
export async function updateMemberAllocation(
  projectId: string,
  userId: string,
  allocationPercentage: number
): Promise<boolean> {
  const response = await fetchWithAuth(
    `/projects/${projectId}/members/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        allocationPercentage,
        redistributeTasks: true, // Add this flag to enable task redistribution
      }),
    }
  );

  if (!response.success) {
    console.error("Failed to update member allocation:", response.error);
    throw new Error(response.error || "Failed to update member allocation");
  }

  return response.success;
}

// Remove project member with task reassignment
export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<boolean> {
  const response = await fetchWithAuth(
    `/projects/${projectId}/members/${userId}`,
    {
      method: "DELETE",
      body: JSON.stringify({
        redistributeTasks: true, // Add this flag to enable task redistribution
      }),
    }
  );

  if (!response.success) {
    console.error("Failed to remove project member:", response.error);
    throw new Error(response.error || "Failed to remove project member");
  }

  return response.success;
}

// Get all users (for member selection)
export async function getAllUsers(): Promise<
  { username: string; isLocked: boolean }[]
> {
  const response = await fetchWithAuth("/users");

  if (!response.users) {
    console.error("Failed to get users:", response.error);
    throw new Error(response.error || "Failed to get users");
  }

  return response.users;
}

// Get project stats
export async function getProjectStats(projectId: string): Promise<{
  totalImages: number;
  assignedImages: number;
  completedImages: number;
  approvedImages: number;
  memberStats: {
    userId: string;
    assigned: number;
    completed: number;
    approved: number;
    timeSpent: number;
  }[];
}> {
  const response = await fetchWithAuth(`/projects/${projectId}/stats`);
  return response.stats;
}

// Get member assignments
export async function getMemberAssignments(
  projectId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  assignments: ImageAssignment[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const response = await fetchWithAuth(
    `/projects/${projectId}/assignments?page=${page}&limit=${limit}`
  );
  return response;
}

// Submit project for review
export async function submitProject(userId: string, projectId: string): Promise<boolean> {
  const response = await fetchWithAuth(`/projects/${projectId}/submit`, {
    method: "POST"
  });
  
  return response.success === true;
}

// Unmark project (admin only)
export async function unmarkProject(projectId: string): Promise<boolean> {
  const response = await fetchWithAuth(`/projects/${projectId}/unmark`, {
    method: "POST"
  });
  
  return response.success === true;
}
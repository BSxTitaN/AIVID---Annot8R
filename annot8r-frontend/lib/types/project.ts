// lib/types/project.ts

export enum ProjectStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  COMPLETED = "completed",
  ARCHIVED = "archived",
}

export enum AnnotationFormat {
  YOLO = "yolo",
  COCO = "coco",
  PASCAL_VOC = "pascal_voc",
}

export interface ProjectSettings {
  allowCustomClasses: boolean;
  requireReview: boolean;
  autoDistribute: boolean;
  modelFormat: AnnotationFormat;
}

export interface ProjectMember {
  userId: string;
  allocationPercentage: number;
  assignedImages: string[];
  completedImages: string[];
  lastActivity?: Date;
  timeSpent: number;
}

export interface ProjectStats {
  assignedImages: number;
  completedImages: number;
  approvedImages: number;
  totalAnnotations: number;
  lastActivity: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: Date;
  createdBy: string;
  settings: ProjectSettings;
  classes: string[];
  totalImages: number;
  stats: ProjectStats;
  members: ProjectMember[];
}

export interface AssignedProject {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  allocationPercentage: number;
  stats: {
    assigned: number;
    completed: number;
    timeSpent: number;
  };
  lastActivity: Date;
  modelFormat: AnnotationFormat;
  totalImages: number;
  projectStats: {
    assignedImages: number;
    completedImages: number;
    approvedImages: number;
  };
}

export interface ImageAssignment {
  imageId: string;
  assignedTo: string;
  assignedAt: Date;
  status:
    | "pending"
    | "in_progress"
    | "completed"
    | "review_pending"
    | "changes_requested";
  metadata: {
    originalName: string;
    size: number;
    dimensions: {
      width: number;
      height: number;
    };
  };
  review?: {
    reviewedBy?: string;
    reviewedAt?: Date;
    status: "approved" | "changes_requested";
    feedback?: string;
  };
}

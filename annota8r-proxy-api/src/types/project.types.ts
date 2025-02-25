export enum ProjectStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    ARCHIVED = 'archived'
  }
  
  export enum AnnotationFormat {
    YOLO = 'yolo',
    COCO = 'coco',
    PASCAL_VOC = 'pascal_voc'
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
    timeSpent: number; // In minutes
  }
  
  export interface Project {
    _id?: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    createdAt: Date;
    createdBy: string; // Admin username
    settings: ProjectSettings;
    members: ProjectMember[];
    classes: string[];
    totalImages: number;
    stats: {
      assignedImages: number;
      completedImages: number;
      approvedImages: number;
      totalAnnotations: number;
      lastActivity: Date;
    };
  }
  
  export interface ImageAssignment {
    _id?: string;
    projectId: string;
    imageId: string;
    assignedTo: string;
    assignedAt: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'review_pending' | 'changes_requested';
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
      status: 'approved' | 'changes_requested';
      feedback?: string;
      revisionHistory: {
        timestamp: Date;
        reviewer: string;
        status: 'approved' | 'changes_requested';
        feedback?: string;
      }[];
    };
  }
  
  export interface ProjectStats {
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
  }
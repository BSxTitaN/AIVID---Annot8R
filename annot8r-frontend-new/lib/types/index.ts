/**
 * Frontend type definitions for the annotation platform
 */

// Enums
export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum ProjectStatus {
  CREATED = "CREATED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export enum ImageStatus {
  UPLOADED = "UPLOADED",
  ASSIGNED = "ASSIGNED",
  ANNOTATED = "ANNOTATED",
  UNDER_REVIEW = "UNDER_REVIEW",
  REVIEWED = "REVIEWED",
  APPROVED = "APPROVED",
}

export enum AnnotationStatus {
  UNANNOTATED = "UNANNOTATED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export enum ReviewStatus {
  NOT_REVIEWED = "NOT_REVIEWED",
  UNDER_REVIEW = "UNDER_REVIEW",
  FLAGGED = "FLAGGED",
  APPROVED = "APPROVED",
}

export enum AssignmentStatus {
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  NEEDS_REVISION = "NEEDS_REVISION",
  COMPLETED = "COMPLETED",
}

export enum SubmissionStatus {
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  REJECTED = "REJECTED",
  APPROVED = "APPROVED",
}

export enum ExportStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

// User-related interfaces
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isOfficeUser: boolean;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  isOfficeUser: boolean;
  firstName: string;
  lastName: string;
}

// Project-related interfaces
export interface ProjectClass {
  id: string;
  name: string;
  color: string;
  isCustom: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  annotationFormat: string;
  classes: ProjectClass[];
  allowCustomClasses: boolean;
  status: ProjectStatus;
  totalImages: number;
  annotatedImages: number;
  reviewedImages: number;
  approvedImages: number;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  isOfficeUser: boolean;
  addedAt: string;
}

// Image-related interfaces
export interface ProjectImage {
  id: string;
  filename: string;
  width: number;
  height: number;
  status: ImageStatus;
  annotationStatus: AnnotationStatus;
  reviewStatus: ReviewStatus;
  uploadedAt: string;
  assignedTo?: string;
  annotatedBy?: string;
  reviewedBy?: string;
  annotatedAt?: string;
  reviewedAt?: string;
  autoAnnotated: boolean;
  timeSpent: number;
  reviewFeedback?: string;
}

export interface ProxiedImageUrl {
  url: string;
  token: string;
  expiresAt: string;
}

// Annotation-related interfaces
export interface YoloObject {
  classId: string;
  className: string;
  x: number; // Center x (normalized 0-1)
  y: number; // Center y (normalized 0-1)
  width: number; // Width (normalized 0-1)
  height: number; // Height (normalized 0-1)
}

export interface Annotation {
  id: string;
  version: number;
  objects: YoloObject[];
  timeSpent: number;
  autoAnnotated: boolean;
  updatedAt: string;
}

// Assignment-related interfaces
export interface Assignment {
  id: string;
  userId: string;
  username: string;
  userFullName: string;
  status: AssignmentStatus;
  totalImages: number;
  completedImages: number;
  progress: number;
  assignedAt: string;
  lastActivity?: string;
}

// Submission-related interfaces
export interface FlaggedImage {
  imageId: string;
  filename: string;
  reason: string;
}

export interface ReviewHistoryItem {
  reviewedBy: string;
  reviewedAt: string;
  status: SubmissionStatus;
  feedback?: string;
  flaggedImagesCount: number;
}

// lib/types/index.ts - Update Submission interface
export interface Submission {
  id: string;
  assignmentId: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  submittedBy?: {
    id: string;
    username: string;
    name: string;
  };
  reviewedBy?: {
    id: string;
    username: string;
    name: string;
  };
  message: string; // User's submission message
  feedback?: string;
  imageCount: number;
  flaggedImagesCount: number;
  images?: Array<{
    id: string;
    filename: string;
    reviewStatus: ReviewStatus;
    reviewFeedback?: string;
  }>;
  flaggedImages?: FlaggedImage[];
  reviewHistory?: ReviewHistoryItem[];
  imageFeedback?: ImageFeedback[];
}

export interface ImageFeedback {
  imageId: string;
  feedback: string;
}

// Export-related interfaces
export interface ProjectExport {
  id: string;
  format: string;
  status: ExportStatus;
  includesImages: boolean;
  onlyReviewedAnnotations: boolean;
  totalImages: number;
  totalAnnotations: number;
  exportedAt: string;
  exportedBy: {
    id: string;
    username: string;
    name: string;
  };
  url?: string;
  expiresAt?: string;
}

// API-related interfaces
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Request-related interfaces
export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isOfficeUser: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  isOfficeUser?: boolean;
  isActive?: boolean;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  annotationFormat: string;
  classes: Array<{
    name: string;
    color: string;
  }>;
  allowCustomClasses: boolean;
}

export interface UpdateProjectRequest {
  description?: string;
  classes?: ProjectClass[];
  allowCustomClasses?: boolean;
  status?: ProjectStatus;
}

export interface AddProjectMemberRequest {
  userId: string;
  role: string;
}

export interface ManualAssignmentRequest {
  userAssignments: Array<{
    userId: string;
    count: number;
  }>;
}

export interface SaveAnnotationRequest {
  objects: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  classIds: string[];
  classNames: string[];
  timeSpent: number;
  autoAnnotated: boolean;
}

export interface SubmitForReviewRequest {
  assignmentId: string;
  message: string; // Changed from optional to required with empty string default
}

export interface ReviewSubmissionRequest {
  status: SubmissionStatus;
  feedback: string;
  flaggedImages: Array<{
    imageId: string;
    reason: string;
  }>;
  imageFeedback?: Array<{
    imageId: string;
    feedback: string;
  }>;
}

export interface CreateExportRequest {
  format: string;
  includesImages: boolean;
  onlyReviewedAnnotations: boolean;
}

// Dashboard-related interfaces
export interface DashboardStats {
  projects: {
    total: number;
    completed: number;
    completionRate: number;
  };
  users: {
    total: number;
  };
  images: {
    total: number;
    annotated: number;
    reviewed: number;
    annotationCompletionRate: number;
    reviewCompletionRate: number;
  };
  annotations: {
    total: number;
  };
}

export interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  user: {
    id: string;
    username: string;
    name: string;
  };
  projectId?: string;
  method: string;
  path: string;
  ip: string;
  details: Record<string, unknown>;
}

/**
 * Interface for creating an admin
 */
export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Interface for updating an admin
 */
export interface UpdateAdminRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

/**
 * Enum representing the possible activity actions
 */
export enum ActivityAction {
  USER_CREATED = "USER_CREATED",
  USER_UPDATED = "USER_UPDATED",
  USER_DELETED = "USER_DELETED",

  PROJECT_CREATED = "PROJECT_CREATED",
  PROJECT_UPDATED = "PROJECT_UPDATED",
  PROJECT_DELETED = "PROJECT_DELETED",

  IMAGES_UPLOADED = "IMAGES_UPLOADED",
  IMAGE_DELETED = "IMAGE_DELETED",

  MEMBER_ADDED = "MEMBER_ADDED",
  MEMBER_REMOVED = "MEMBER_REMOVED",

  IMAGES_ASSIGNED = "IMAGES_ASSIGNED",
  IMAGES_REASSIGNED = "IMAGES_REASSIGNED",

  ANNOTATION_CREATED = "ANNOTATION_CREATED",
  ANNOTATION_UPDATED = "ANNOTATION_UPDATED",
  AUTO_ANNOTATION_APPLIED = "AUTO_ANNOTATION_APPLIED",

  SUBMISSION_CREATED = "SUBMISSION_CREATED",
  SUBMISSION_REVIEWED = "SUBMISSION_REVIEWED",

  PROJECT_EXPORTED = "PROJECT_EXPORTED",

  PASSWORD_RESET = "PASSWORD_RESET",
  USER_LOGIN = "USER_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",

  // Dashboard-related activity types
  DASHBOARD_VIEWED = "DASHBOARD_VIEWED",
  STATS_VIEWED = "STATS_VIEWED",
  LOGS_VIEWED = "LOGS_VIEWED",
  LOGS_EXPORTED = "LOGS_EXPORTED",

  // System monitoring actions
  SYSTEM_STATUS_CHECKED = "SYSTEM_STATUS_CHECKED",

  // Admin-specific actions
  ADMINS_VIEWED = "ADMINS_VIEWED",
  ADMIN_VIEWED = "ADMIN_VIEWED",

  USERS_VIEWED = "USERS_VIEWED",

  // Unknown event type for unclassified actions
  UNKNOWN_EVENT = "UNKNOWN_EVENT",
}

/**
 * Interface for activity log entries as displayed in the frontend
 */
export interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  user: {
    id: string;
    username: string;
    name: string;
  };
  projectId?: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  details: Record<string, unknown>;
  apiPath: string;
}

export interface UserProgressMetric {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  isOfficeUser: boolean;
  totalAssigned: number;
  annotated: number;
  unannotated: number;
  progress: number;
  timeSpent: number; // Time spent in seconds
  averageTimePerImage: number; // Average time per image in seconds
  lastActivity: Date | null;
}

// Interface for assignment metrics
export interface AssignmentMetrics {
  totalImages: number;
  unassignedImages: number;
  assignedImages: number;
  annotatedImages: number;
  redistributableImages: number;
  userProgress: UserProgressMetric[];
}

// Interface for project member for assignment
export interface ProjectMemberForAssignment {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  isOfficeUser: boolean;
}

// Updated ManualAssignmentRequest interface
export interface ManualAssignmentRequest {
  userAssignments: {
    userId: string;
    count: number;
  }[];
  resetDistribution?: boolean;
}

export interface UserDashboardStats {
  totalProjects: number;
  totalAssignedImages: number;
  completedImages: number;
  pendingReviewImages: number;
  rejectedImages: number;
  approvedImages: number;
  recentActivity: Array<{
    id: string;
    action: string;
    projectId?: string;
    projectName?: string;
    timestamp: Date;
    details: Record<string, unknown>;
  }>;
  projectsWithPendingWork: number;
}

/**
 * Interface representing project completion status for a user
 */
export interface ProjectCompletionStatus {
  isCompleted: boolean;
  hasAssignedImages: boolean;
  pendingImages?: number;
  totalAssigned?: number;
  lastSubmissionStatus?: string;
  message: string;
}

// Add these to your existing lib/types/index.ts file

/**
 * Interface for user assignments in project stats
 */
export interface UserAssignment {
  id: string;
  status: AssignmentStatus;
  totalImages: number;
  completedImages: number;
  assignedAt: string;
  lastActivity?: string;
}

/**
 * Interface for user submissions in project stats
 */
export interface UserSubmission {
  id: string;
  status: SubmissionStatus;
  submittedAt: string;
  reviewedAt?: string;
  feedback?: string;
  imageCount: number;
  flaggedImagesCount: number;
}

/**
 * Interface for project stats
 */
export interface ProjectStats {
  totalAssigned: number;
  annotated: number;
  unannotated: number;
  pendingReview: number;
  rejected: number;
  approved: number;
  progress: number;
  assignments: UserAssignment[];
  submissions: UserSubmission[];
}

// backend/types/index.ts
import { ObjectId } from "mongodb";

/**
 * Enum representing the possible user roles in the system
 */
export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}

/**
 * Enum representing the possible project statuses
 */
export enum ProjectStatus {
  CREATED = "CREATED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

/**
 * Enum representing the possible image statuses
 */
export enum ImageStatus {
  UPLOADED = "UPLOADED",
  ASSIGNED = "ASSIGNED",
  ANNOTATED = "ANNOTATED",
  UNDER_REVIEW = "UNDER_REVIEW",
  REVIEWED = "REVIEWED",
  APPROVED = "APPROVED",
}

/**
 * Enum representing the possible annotation statuses
 */
export enum AnnotationStatus {
  UNANNOTATED = "UNANNOTATED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

/**
 * Enum representing the possible review statuses
 */
export enum ReviewStatus {
  NOT_REVIEWED = "NOT_REVIEWED",
  UNDER_REVIEW = "UNDER_REVIEW",
  FLAGGED = "FLAGGED",
  APPROVED = "APPROVED",
}

/**
 * Enum representing the possible assignment statuses
 */
export enum AssignmentStatus {
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  NEEDS_REVISION = "NEEDS_REVISION",
  COMPLETED = "COMPLETED",
}

/**
 * Enum representing the possible submission statuses
 */
export enum SubmissionStatus {
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  REJECTED = "REJECTED",
  APPROVED = "APPROVED",
}

/**
 * Enum representing the possible export statuses
 */
export enum ExportStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
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
  UNKNOWN_EVENT = "UNKNOWN_EVENT"
}

/**
 * Interface representing a user in the system
 */
export interface User {
  _id: ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isOfficeUser: boolean; // Identifies internal users who can auto-annotate
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  createdBy: ObjectId;
  lastIpAddress?: string;
  lastUserAgent?: string;
}

/**
 * Interface representing a class in a project
 */
export interface ProjectClass {
  id: string;
  name: string;
  color: string;
  isCustom: boolean;
}

/**
 * Interface representing a project
 */
export interface Project {
  _id: ObjectId;
  name: string;
  description: string;
  annotationFormat: string; // Currently only "YOLO" is supported
  classes: ProjectClass[];
  allowCustomClasses: boolean;
  status: ProjectStatus;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  totalImages: number;
  annotatedImages: number;
  reviewedImages: number;
  approvedImages: number;
  completionPercentage: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;
}

/**
 * Interface representing a member of a project
 */
export interface ProjectMember {
  _id: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;
  role: string; // "ANNOTATOR" or "REVIEWER"
  addedAt: Date;
  addedBy: ObjectId;
}

/**
 * Interface representing an image in a project
 */
export interface ProjectImage {
  _id: ObjectId;
  projectId: ObjectId;
  filename: string;
  s3Key: string;
  width: number;
  height: number;
  uploadedAt: Date;
  uploadedBy: ObjectId;
  status: ImageStatus;
  assignedTo?: ObjectId;
  annotationStatus: AnnotationStatus;
  annotatedBy?: ObjectId;
  annotatedAt?: Date;
  autoAnnotated: boolean;
  timeSpent: number; // Time in seconds
  reviewStatus: ReviewStatus;
  reviewedBy?: ObjectId;
  reviewedAt?: Date;
  reviewFeedback?: string;
  currentSubmissionId?: ObjectId;
}

/**
 * Interface representing an assignment of images to a user
 */
export interface ImageAssignment {
  _id: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;
  imageIds: ObjectId[];
  assignedAt: Date;
  assignedBy: ObjectId;
  status: AssignmentStatus;
  totalImages: number;
  completedImages: number;
  lastActivity?: Date;
}

/**
 * Interface representing a YOLO annotation object
 */
export interface YoloObject {
  classId: string;
  className: string;
  x: number; // Center x (normalized 0-1)
  y: number; // Center y (normalized 0-1)
  width: number; // Width (normalized 0-1)
  height: number; // Height (normalized 0-1)
}

/**
 * Interface representing an annotation
 */
export interface Annotation {
  _id: ObjectId;
  projectId: ObjectId;
  imageId: ObjectId;
  userId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  timeSpent: number;
  autoAnnotated: boolean;
  version: number;
  objects: YoloObject[];
}

/**
 * Interface representing a flagged image during review
 */
export interface FlaggedImage {
  imageId: ObjectId;
  reason: string;
}

/**
 * Interface representing a review history item
 */
export interface ReviewHistoryItem {
  reviewedBy: ObjectId;
  reviewedAt: Date;
  status: SubmissionStatus;
  feedback: string;
  flaggedImages: FlaggedImage[];
}

/**
 * Interface representing a submission review
 */
export interface SubmissionReview {
  _id: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;
  assignmentId: ObjectId;
  imageIds: ObjectId[];
  submittedAt: Date;
  reviewedBy?: ObjectId;
  reviewedAt?: Date;
  status: SubmissionStatus;
  message: string;  // Added message field
  feedback: string;
  flaggedImages: FlaggedImage[];
  reviewHistory: ReviewHistoryItem[];
}

/**
 * Interface representing a project export
 */
export interface ProjectExport {
  _id: ObjectId;
  projectId: ObjectId;
  exportedAt: Date;
  exportedBy: ObjectId;
  s3Key: string;
  format: string; // Currently only "YOLO" is supported
  totalImages: number;
  totalAnnotations: number;
  includesImages: boolean;
  onlyReviewedAnnotations: boolean;
  status: ExportStatus;
  url?: string;
  expiresAt?: Date;
}

/**
 * Interface representing an activity log
 */
export interface ActivityLog {
  _id: ObjectId;
  projectId?: ObjectId;
  userId: ObjectId;
  timestamp: Date;
  action: ActivityAction;
  apiPath: string;
  method: string;
  userIp: string;
  userAgent: string;
  details: Record<string, unknown>;
}

/**
 * Interface representing an authentication token
 */
export interface AuthToken {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
  createdAt: Date;
  expiresAt: Date; // 30 minutes from creation
  lastUsedAt: Date;
  userAgent: string;
  ipAddress: string;
  isRevoked: boolean;
}

// Request/Response Types

/**
 * Interface for login request
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Interface for login response
 */
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: UserRole;
    isOfficeUser: boolean;
    firstName: string;
    lastName: string;
  };
}

/**
 * Interface for creating a user
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isOfficeUser: boolean;
}

/**
 * Interface for updating a user
 */
export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  isOfficeUser?: boolean;
  isActive?: boolean;
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
 * Interface for resetting a password
 */
export interface ResetPasswordRequest {
  userId: string;
  newPassword: string;
}

/**
 * Interface for creating a project
 */
export interface CreateProjectRequest {
  name: string;
  description: string;
  annotationFormat: string; // Currently only "YOLO" is supported
  classes: Omit<ProjectClass, "id">[];
  allowCustomClasses: boolean;
}

/**
 * Interface for updating a project
 */
export interface UpdateProjectRequest {
  description?: string;
  classes?: ProjectClass[];
  allowCustomClasses?: boolean;
  status?: ProjectStatus;
}

/**
 * Interface for adding a member to a project
 */
export interface AddProjectMemberRequest {
  userId: string;
  role: string; // "ANNOTATOR" or "REVIEWER"
}

/**
 * Interface for manual image assignments
 */
export interface ManualAssignmentRequest {
  userAssignments: {
    userId: string;
    count: number;
  }[];
  resetDistribution?: boolean;
}


/**
 * Interface for creating/updating annotations
 */
export interface SaveAnnotationRequest {
  objects: Omit<YoloObject, "classId" | "className">[];
  classIds: string[];
  classNames: string[];
  timeSpent: number;
  autoAnnotated: boolean;
}

/**
 * Interface for auto-save annotations
 */
export interface AutosaveAnnotationRequest {
  objects: Omit<YoloObject, "classId" | "className">[];
  classIds: string[];
  classNames: string[];
  timeSpent: number;
}

/**
 * Interface for submitting for review
 */
export interface SubmitForReviewRequest {
  assignmentId: string;
  message: string;  // Changed from optional to required with empty string default
}

/**
 * Interface representing a flagged image during review
 */
export interface FlaggedImage {
  imageId: ObjectId;
  reason: string;
}

/**
 * Interface for reviewing a submission
 */
export interface ReviewSubmissionRequest {
  status: SubmissionStatus;
  feedback: string;
  flaggedImages: {
    imageId: string;
    reason: string;
  }[];
}

/**
 * Interface for creating an export
 */
export interface CreateExportRequest {
  format: string; // Currently only "YOLO" is supported
  includesImages: boolean;
  onlyReviewedAnnotations: boolean;
}

/**
 * Interface for proxied image URL
 */
export interface ProxiedImageResponse {
  url: string;
  token: string;
  expiresAt: Date;
}

/**
 * Interface for pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Interface for a paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface for API response
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Interface for environment variables
 */
export interface Env {
  MONGODB_URI: string;
  JWT_SECRET: string;
  S3_BUCKET: string;
  S3_REGION: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  IMAGE_TOKEN_SECRET: string;
}

/**
 * Interface for defining route context with environment variables
 */
export interface HonoContext {
  Bindings: Env;
  Variables: {
    user?: User;
    project?: Project;
    image?: ProjectImage;
    submission?: SubmissionReview;
    requestStartTime?: number;
  };
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

export interface AssignmentMetrics {
  totalImages: number;
  unassignedImages: number;
  assignedImages: number;
  annotatedImages: number;
  redistributableImages: number;
  userProgress: UserProgressMetric[];
}

export interface ProjectMemberForAssignment {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  isOfficeUser: boolean;
}

/**
 * Interface representing user dashboard statistics
 */
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

/**
 * Interface for image-specific feedback in submissions
 */
export interface ImageFeedback {
  imageId: ObjectId;
  feedback: string;
}

/**
 * Updated interface for review history item with image feedback
 */
export interface ReviewHistoryItem {
  reviewedBy: ObjectId;
  reviewedAt: Date;
  status: SubmissionStatus;
  feedback: string;
  flaggedImages: FlaggedImage[];
  imageFeedback?: ImageFeedback[]; // Add the optional imageFeedback array
}

/**
 * Updated interface for submission review with image feedback
 */
export interface SubmissionReview {
  _id: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;
  assignmentId: ObjectId;
  imageIds: ObjectId[];
  submittedAt: Date;
  reviewedBy?: ObjectId;
  reviewedAt?: Date;
  status: SubmissionStatus;
  message: string;
  feedback: string;
  flaggedImages: FlaggedImage[];
  imageFeedback?: ImageFeedback[]; // Add the optional imageFeedback array
  reviewHistory: ReviewHistoryItem[];
}

/**
 * Updated interface for review submission request with image feedback
 */
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
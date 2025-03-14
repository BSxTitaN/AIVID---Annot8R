// src/services/service-factory.ts
import { UserService } from './user-service.js';
import { AuthTokenService } from './auth-token-service.js';
import { ProjectService } from './project-service.js';
import { ImageService } from './image-service.js';
import { AssignmentService } from './assignment-service.js';
import { AnnotationService } from './annotation-service.js';
import { SubmissionService } from './submission-service.js';
import { ExportService } from './export-service.js';
import { DashboardService } from './dashboard-service.js'; // Import the new service

// Service singleton instances
let userService: UserService | null = null;
let authTokenService: AuthTokenService | null = null;
let projectService: ProjectService | null = null;
let imageService: ImageService | null = null;
let assignmentService: AssignmentService | null = null;
let annotationService: AnnotationService | null = null;
let submissionService: SubmissionService | null = null;
let exportService: ExportService | null = null;
let dashboardService: DashboardService | null = null; // Add new service instance

/**
 * Service factory to get singleton instances
 */
export const services = {
  users(): UserService {
    if (!userService) userService = new UserService();
    return userService;
  },
  authTokens(): AuthTokenService {
    if (!authTokenService) authTokenService = new AuthTokenService();
    return authTokenService;
  },
  projects(): ProjectService {
    if (!projectService) projectService = new ProjectService();
    return projectService;
  },
  images(): ImageService {
    if (!imageService) imageService = new ImageService();
    return imageService;
  },
  assignments(): AssignmentService {
    if (!assignmentService) assignmentService = new AssignmentService();
    return assignmentService;
  },
  annotations(): AnnotationService {
    if (!annotationService) annotationService = new AnnotationService();
    return annotationService;
  },
  submissions(): SubmissionService {
    if (!submissionService) submissionService = new SubmissionService();
    return submissionService;
  },
  exports(): ExportService {
    if (!exportService) exportService = new ExportService();
    return exportService;
  },
  dashboard(): DashboardService { // Add method to get dashboard service
    if (!dashboardService) dashboardService = new DashboardService();
    return dashboardService;
  }
};
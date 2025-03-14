// src/services/user-service.ts
import { ObjectId, type Filter } from "mongodb";
import {
  UserRole,
  type User,
  type CreateUserRequest,
  type UpdateUserRequest,
  type CreateAdminRequest,
  type ResetPasswordRequest
} from "../types/index.js";
import { password } from "../utils/password.js";
import { BaseService } from "./base-service.js";

export class UserService extends BaseService<User> {
  constructor() {
    super('users');
  }
  
  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ username } as Filter<User>);
  }
  
  /**
   * Create a regular user
   */
  async createUser(userData: CreateUserRequest, createdBy: ObjectId): Promise<User> {
    const existingUser = await this.findByUsername(userData.username);
    if (existingUser) {
      throw new Error("Username already exists");
    }
    
    return this.create({
      username: userData.username,
      email: userData.email,
      passwordHash: password.hash(userData.password),
      role: UserRole.USER,
      isOfficeUser: userData.isOfficeUser,
      firstName: userData.firstName,
      lastName: userData.lastName,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      createdBy
    });
  }
  
  /**
   * Create an admin user
   */
  async createAdmin(adminData: CreateAdminRequest, createdBy: ObjectId): Promise<User> {
    const existingUser = await this.findByUsername(adminData.username);
    if (existingUser) {
      throw new Error("Username already exists");
    }
    
    return this.create({
      username: adminData.username,
      email: adminData.email,
      passwordHash: password.hash(adminData.password),
      role: UserRole.ADMIN,
      isOfficeUser: true, // Admins are always office users
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      createdBy
    });
  }
  
  /**
   * Update a user
   */
  async updateUser(userId: string, updates: UpdateUserRequest): Promise<User | null> {
    return this.update(userId, updates);
  }
  
  /**
   * Authenticate a user
   */
  async authenticate(username: string, plainPassword: string): Promise<User | null> {
    const user = await this.findOne({ username, isActive: true } as Filter<User>);
    if (!user) return null;
    
    return password.verify(plainPassword, user.passwordHash) ? user : null;
  }
  
  /**
   * Reset user password
   */
  async resetPassword(data: ResetPasswordRequest): Promise<boolean> {
    const result = await this.update(data.userId, {
      passwordHash: password.hash(data.newPassword)
    });
    
    return !!result;
  }
  
  /**
   * Update last login info
   */
  async updateLastLogin(
    userId: ObjectId,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.collection().updateOne(
      { _id: userId } as Filter<User>,
      {
        $set: {
          lastLoginAt: new Date(),
          ...(ipAddress && { lastIpAddress: ipAddress }),
          ...(userAgent && { lastUserAgent: userAgent })
        }
      }
    );
  }
  
  /**
   * Get all regular users
   */
  async getAllUsers(page: number = 1, limit: number = 20): Promise<{ users: User[], total: number }> {
    const { items, total } = await this.paginate(
      { role: UserRole.USER } as Filter<User>,
      page,
      limit,
      { createdAt: -1 }
    );
    
    return { users: items, total };
  }
  
  /**
   * Get all admin users
   */
  async getAllAdmins(page: number = 1, limit: number = 20): Promise<{ admins: User[], total: number }> {
    const { items, total } = await this.paginate(
      { role: UserRole.ADMIN } as Filter<User>,
      page,
      limit,
      { createdAt: -1 }
    );
    
    return { admins: items, total };
  }
  
  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<boolean> {
    return this.delete(userId);
  }
}
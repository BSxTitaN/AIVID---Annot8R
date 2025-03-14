import { MongoClient, Db } from "mongodb";
import type { Env } from "../types/index.js";

// MongoDB client instance
let client: MongoClient | null = null;
let database: Db | null = null;
let connected = false;

// Initialize MongoDB connection
export const db = {
  /**
   * Connect to MongoDB
   */
  connect: async (env: Env): Promise<Db> => {
    if (database) return database;

    try {
      console.log("🔄 Connecting to MongoDB...");
      client = new MongoClient(env.MONGODB_URI);
      await client.connect();
      database = client.db();

      // Test connection with a simple command
      await database.command({ ping: 1 });
      connected = true;
      console.log("✅ MongoDB connection established successfully");

      return database;
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      connected = false;
      throw error;
    }
  },

  /**
   * Get MongoDB database instance
   */
  getDb: (): Db => {
    if (!database) {
      throw new Error("Database not initialized. Call connect() first.");
    }
    return database;
  },

  /**
   * Close MongoDB connection
   */
  close: async (): Promise<void> => {
    if (client) {
      console.log("🔄 Closing MongoDB connection...");
      await client.close();
      client = null;
      database = null;
      connected = false;
      console.log("✅ MongoDB connection closed successfully");
    }
  },

  /**
   * Check if MongoDB is connected
   */
  isConnected: (): boolean => {
    return connected && client !== null && database !== null;
  },
};

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from 'hono/cors';
import dotenv from "dotenv";
import { db, s3, validateEnv } from "./config/index.js";
import { apiRouter } from "./routes/index.js";
import type { HonoContext, Env } from "./types/index.js";

// Load environment variables
dotenv.config();

// Create environment object from process.env
const environment: Partial<Env> = {
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  IMAGE_TOKEN_SECRET: process.env.IMAGE_TOKEN_SECRET,
};

// Log environment variables status (without showing sensitive values)
console.log("Environment variables status:");
console.log(
  `- MONGODB_URI: ${environment.MONGODB_URI ? "✓ Set" : "✗ Missing"}`
);
console.log(`- JWT_SECRET: ${environment.JWT_SECRET ? "✓ Set" : "✗ Missing"}`);
console.log(`- S3_BUCKET: ${environment.S3_BUCKET ? "✓ Set" : "✗ Missing"}`);
console.log(`- S3_REGION: ${environment.S3_REGION ? "✓ Set" : "✗ Missing"}`);
console.log(
  `- S3_ACCESS_KEY: ${environment.S3_ACCESS_KEY ? "✓ Set" : "✗ Missing"}`
);
console.log(
  `- S3_SECRET_KEY: ${environment.S3_SECRET_KEY ? "✓ Set" : "✗ Missing"}`
);
console.log(
  `- IMAGE_TOKEN_SECRET: ${
    environment.IMAGE_TOKEN_SECRET ? "✓ Set" : "✗ Missing"
  }`
);

// Initialize app
const app = new Hono<HonoContext>();

// Add CORS middleware
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Explicitly pass environment variables to the Hono context
app.use("*", async (c, next) => {
  // Add environment variables to the Hono context
  c.env = {
    ...c.env,
    ...environment,
  } as Env;

  try {
    console.log("\n🚀 Starting Annotation Platform API...");

    if (validateEnv(c.env as Partial<Env>)) {
      console.log("✅ Environment variables validated successfully");

      // Initialize services
      try {
        await db.connect(c.env);
        await s3.initialize(c.env);

        console.log("\n📊 System Status:");
        console.log("  - MongoDB: Connected");
        console.log(`  - S3: Connected (Bucket: ${c.env.S3_BUCKET})`);
        console.log("  - API: Ready to serve requests\n");

        await next();
      } catch (error) {
        console.error("❌ Service initialization failed:", error);
        return c.text(
          "Service initialization failed. Please check your connection settings.",
          500
        );
      }
    }
  } catch (error) {
    console.error("❌ Environment validation error:", error);

    // Display which environment variables are missing
    const missingVars = [
      "MONGODB_URI",
      "JWT_SECRET",
      "S3_BUCKET",
      "S3_REGION",
      "S3_ACCESS_KEY",
      "S3_SECRET_KEY",
      "IMAGE_TOKEN_SECRET",
    ].filter((key) => !c.env[key as keyof Env]);

    if (missingVars.length > 0) {
      console.error(`Missing environment variables: ${missingVars.join(", ")}`);
    }

    return c.text(
      "Server configuration error: Invalid environment variables",
      500
    );
  }
});

// Mount API router
app.route("/api/v1", apiRouter);

// Simple health check endpoint
app.get("/", (c) => {
  const mongoStatus = db.isConnected() ? "connected" : "disconnected";
  const s3Status = s3.getClient() ? "connected" : "disconnected";

  return c.json({
    status: "ok",
    message: "Annotation Platform API is running",
    connections: {
      mongodb: mongoStatus,
      s3: s3Status,
    },
    timestamp: new Date().toISOString(),
  });
});

// Start server
const PORT = process.env.PORT || 3001;

serve(
  {
    fetch: app.fetch,
    port: Number(PORT),
  },
  (info) => {
    console.log(`\n🌐 Server is running on http://localhost:${info.port}`);
    console.log(`📌 Health check: http://localhost:${info.port}/`);
    console.log(`📌 API endpoint: http://localhost:${info.port}/api/v1`);
    console.log(`\n💡 Press Ctrl+C to stop the server\n`);
  }
);

// Handle shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  await db.close();
  console.log("👋 Server stopped gracefully");
  process.exit(0);
});
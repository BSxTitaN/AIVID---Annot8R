/**
 * Script to create a super admin user
 *
 * Usage:
 * node scripts/create-super-admin.js <username> <password> <email> <firstName> <lastName>
 *
 * Example:
 * node scripts/create-super-admin.js admin Admin123! admin@example.com John Doe
 */

import { MongoClient, ObjectId } from "mongodb";
import { createHash, randomBytes } from "crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set.");
  process.exit(1);
}

// Hash a password with salt
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(password + salt)
    .digest("hex");

  return `${salt}:${hash}`;
}

async function createSuperAdmin() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  if (args.length < 5) {
    console.error(
      "❌ Usage: node scripts/create-super-admin.js <username> <password> <email> <firstName> <lastName>"
    );
    process.exit(1);
  }

  const [username, password, email, firstName, lastName] = args;

  // Validate input
  if (!username || username.length < 3) {
    console.error("❌ Username must be at least 3 characters long.");
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error("❌ Password must be at least 8 characters long.");
    process.exit(1);
  }

  if (!email || !email.includes("@")) {
    console.error("❌ Invalid email address.");
    process.exit(1);
  }

  if (!firstName || !lastName) {
    console.error("❌ First name and last name are required.");
    process.exit(1);
  }

  // Connect to MongoDB
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB successfully.");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Check if username already exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      console.error(`❌ A user with username "${username}" already exists.`);
      process.exit(1);
    }

    // Create super admin user
    const now = new Date();
    const superAdminUser = {
      _id: new ObjectId(),
      username,
      email,
      passwordHash: hashPassword(password),
      role: "SUPER_ADMIN",
      isOfficeUser: true, // Super admins should have office user privileges
      firstName,
      lastName,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      createdBy: new ObjectId(), // Self-created
    };

    const result = await usersCollection.insertOne(superAdminUser);

    if (result.acknowledged) {
      console.log("✅ Super admin user created successfully!");
      console.log(`
      Username: ${username}
      Email: ${email}
      Role: SUPER_ADMIN
      ID: ${superAdminUser._id}
      `);
    } else {
      console.error("❌ Failed to create super admin user.");
    }
  } catch (error) {
    console.error("❌ Error creating super admin user:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("✅ MongoDB connection closed.");
    }
  }
}

// Run the script
createSuperAdmin().catch(console.error);

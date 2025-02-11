// scripts/create-super-admin.js
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { createHash, randomBytes } from 'crypto';
import { pbkdf2 } from 'crypto';
import { promisify } from 'util';

config();

const pbkdf2Async = promisify(pbkdf2);

async function hashPassword(password) {
  const salt = randomBytes(32).toString('hex');
  const hash = await pbkdf2Async(
    password,
    salt,
    600000, // iterations
    64,     // keylen
    'sha512'
  );
  return { hash: hash.toString('hex'), salt };
}

async function createSuperAdmin() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('annot8r');
    const admins = db.collection('admins');

    // Check if super admin already exists
    const existingSuperAdmin = await admins.findOne({ isSuperAdmin: true });
    if (existingSuperAdmin) {
      console.error('Super admin already exists!');
      return;
    }

    // Generate password and hash it
    const password = `ak_${randomBytes(32).toString('base64url')}`;
    const { hash: passwordHash, salt } = await hashPassword(password);

    // Create super admin
    await admins.insertOne({
      username: 'superadmin',
      passwordHash,
      salt,
      isSuperAdmin: true,
      createdAt: new Date(),
      isLocked: false,
      failedLoginAttempts: 0,
      lastLoginAttempt: new Date()
    });

    console.log('\n========== SUPER ADMIN CREATED SUCCESSFULLY ==========');
    console.log('Username: superadmin');
    console.log('Password:', password);
    console.log('IMPORTANT: Save this password securely. It cannot be recovered later!');
    console.log('===============================================\n');
  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await client.close();
  }
}

createSuperAdmin().catch(console.error);
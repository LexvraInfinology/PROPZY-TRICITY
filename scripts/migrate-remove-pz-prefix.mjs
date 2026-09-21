import mongoose from 'mongoose';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DNS resolution fix for Windows + MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

// Load .env.local
function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...rest] = trimmed.split('=');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
        }
      }
    });
  }
}

loadEnvLocal();

const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  console.error('❌ MONGODB_URI is not set in .env.local');
  process.exit(1);
}

async function runMigration() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  await mongoose.connect(mongodbUri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  console.log('✅ Connected to MongoDB successfully.');

  const db = mongoose.connection.db;

  // 1. Migrate Properties collection (pid field: remove PZ- / LR- prefix)
  console.log('\n--- Migrating Properties (pid: PZ-* -> *) ---');
  const propertiesCol = db.collection('properties');
  const pzProperties = await propertiesCol.find({ pid: { $regex: /^(PZ|LR)-/i } }).toArray();
  console.log(`Found ${pzProperties.length} properties with PZ- / LR- prefix.`);

  let updatedPropsCount = 0;
  for (const prop of pzProperties) {
    const oldPid = prop.pid;
    const cleanPid = oldPid.replace(/^(PZ|LR)-/i, '');
    
    // Check if target cleanPid already exists to prevent unique index collisions
    const existing = await propertiesCol.findOne({ pid: cleanPid, _id: { $ne: prop._id } });
    const finalPid = existing ? `${cleanPid}_${Math.floor(10 + Math.random() * 90)}` : cleanPid;

    await propertiesCol.updateOne(
      { _id: prop._id },
      { $set: { pid: finalPid } }
    );
    console.log(`  Updated property [${prop.title?.slice(0, 30)}...]: ${oldPid} -> ${finalPid}`);
    updatedPropsCount++;
  }
  console.log(`✅ Successfully updated ${updatedPropsCount} properties.`);

  // 2. Migrate Inquiries collection (propertyPid field: remove PZ- / LR- prefix)
  console.log('\n--- Migrating Inquiries (propertyPid: PZ-* -> *) ---');
  const inquiriesCol = db.collection('inquiries');
  const pzInquiries = await inquiriesCol.find({ propertyPid: { $regex: /^(PZ|LR)-/i } }).toArray();
  console.log(`Found ${pzInquiries.length} inquiries with PZ- / LR- propertyPid.`);

  let updatedInquiriesCount = 0;
  for (const inq of pzInquiries) {
    const oldPid = inq.propertyPid;
    const cleanPid = oldPid.replace(/^(PZ|LR)-/i, '');
    await inquiriesCol.updateOne(
      { _id: inq._id },
      { $set: { propertyPid: cleanPid } }
    );
    console.log(`  Updated inquiry [${inq.tenantName || inq._id}]: ${oldPid} -> ${cleanPid}`);
    updatedInquiriesCount++;
  }
  console.log(`✅ Successfully updated ${updatedInquiriesCount} inquiries.`);

  // 3. Migrate Users collection (wishlist items & unlockedProperties: remove PZ- / LR- prefix)
  console.log('\n--- Migrating Users (wishlist & unlockedProperties) ---');
  const usersCol = db.collection('users');
  const users = await usersCol.find({
    $or: [
      { wishlist: { $elemMatch: { $regex: /^(PZ|LR)-/i } } },
      { unlockedProperties: { $elemMatch: { $regex: /^(PZ|LR)-/i } } }
    ]
  }).toArray();
  
  let updatedUsersCount = 0;
  for (const user of users) {
    const updates = {};
    
    if (Array.isArray(user.wishlist)) {
      updates.wishlist = user.wishlist.map((item) => {
        if (typeof item === 'string') {
          return item.replace(/^(PZ|LR)-/i, '');
        }
        return item;
      });
    }

    if (Array.isArray(user.unlockedProperties)) {
      updates.unlockedProperties = user.unlockedProperties.map((item) => {
        if (typeof item === 'string') {
          return item.replace(/^(PZ|LR)-/i, '');
        }
        return item;
      });
    }

    await usersCol.updateOne(
      { _id: user._id },
      { $set: updates }
    );
    console.log(`  Updated user [${user.email}]`);
    updatedUsersCount++;
  }
  console.log(`✅ Successfully updated ${updatedUsersCount} users.`);

  // Summary
  console.log('\n=========================================');
  console.log(`🎉 MIGRATION COMPLETE!`);
  console.log(`- Properties updated: ${updatedPropsCount}`);
  console.log(`- Inquiries updated: ${updatedInquiriesCount}`);
  console.log(`- Users updated: ${updatedUsersCount}`);
  console.log('=========================================\n');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

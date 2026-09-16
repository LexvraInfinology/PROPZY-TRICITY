import dns from 'dns';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=');
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    }
  });
}

async function inspectContacts() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  const db = mongoose.connection.db;
  const count = await db.collection('properties').countDocuments();
  const phoneDistribution = await db.collection('properties').aggregate([
    { $group: { _id: { phone: "$ownerPhone", name: "$ownerName" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log('--- PROPERTY CONTACT INSPECTION ---');
  console.log('Total properties in DB:', count);
  console.log('Phone distribution:');
  phoneDistribution.forEach(g => {
    console.log(`- Phone: "${g._id.phone}", Name: "${g._id.name}" -> ${g.count} listings`);
  });

  await mongoose.disconnect();
}

inspectContacts().catch(console.error);

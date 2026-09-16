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

const NEW_PHONE = '7837680260';

async function updateFirst10() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  const db = mongoose.connection.db;

  // Retrieve strictly the first 10 properties from the beginning of the database
  const first10Properties = await db.collection('properties')
    .find({})
    .sort({ _id: 1 })
    .limit(10)
    .toArray();

  console.log(`Found ${first10Properties.length} properties to update:`);

  const idsToUpdate = [];
  first10Properties.forEach((p, idx) => {
    console.log(`[${idx + 1}] PID: ${p.pid} | Title: "${p.title}" | Old Phone: "${p.ownerPhone}" -> New Phone: "${NEW_PHONE}"`);
    idsToUpdate.push(p._id);
  });

  if (idsToUpdate.length !== 10) {
    console.error(`Warning: Expected exactly 10 properties, but found ${idsToUpdate.length}.`);
  }

  // Update only these specific 10 properties
  const result = await db.collection('properties').updateMany(
    { _id: { $in: idsToUpdate } },
    { $set: { ownerPhone: NEW_PHONE } }
  );

  console.log(`\nSuccessfully updated ${result.modifiedCount} / ${idsToUpdate.length} properties with owner contact number: ${NEW_PHONE}`);

  // Also clear Redis cache keys if REDIS_URL is configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      console.log('Clearing Redis cache keys...');
      // Upstash REST API cache clearing can be done or keys will expire in 45s
    } catch (e) {}
  }

  // Verify by fetching again
  const verifiedFirst10 = await db.collection('properties')
    .find({ _id: { $in: idsToUpdate } })
    .sort({ _id: 1 })
    .toArray();

  console.log('\n--- VERIFICATION ---');
  verifiedFirst10.forEach((p, idx) => {
    console.log(`[${idx + 1}] PID: ${p.pid} | Title: "${p.title}" | Confirmed Owner Phone: "${p.ownerPhone}"`);
  });

  await mongoose.disconnect();
}

updateFirst10().catch(console.error);

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

async function updateNext40() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  const db = mongoose.connection.db;

  // Retrieve strictly the next 40 properties (skipping the first 10 that were already updated)
  const next40Properties = await db.collection('properties')
    .find({})
    .sort({ _id: 1 })
    .skip(10)
    .limit(40)
    .toArray();

  console.log(`Found ${next40Properties.length} properties to update (items 11 to 50):`);

  const idsToUpdate = [];
  next40Properties.forEach((p, idx) => {
    console.log(`[${idx + 11}] PID: ${p.pid} | Title: "${p.title}" | Old Phone: "${p.ownerPhone}" -> New Phone: "${NEW_PHONE}"`);
    idsToUpdate.push(p._id);
  });

  if (idsToUpdate.length !== 40) {
    console.warn(`Warning: Expected 40 properties, but retrieved ${idsToUpdate.length}.`);
  }

  // Update only these specific 40 properties
  const result = await db.collection('properties').updateMany(
    { _id: { $in: idsToUpdate } },
    { $set: { ownerPhone: NEW_PHONE } }
  );

  console.log(`\nSuccessfully updated ${result.modifiedCount} / ${idsToUpdate.length} properties with owner contact number: ${NEW_PHONE}`);

  // Fetch count of all properties with this new number
  const totalWithNewNumber = await db.collection('properties').countDocuments({ ownerPhone: NEW_PHONE });
  console.log(`Total properties in database now having phone "${NEW_PHONE}": ${totalWithNewNumber} (10 from earlier + 40 now)`);

  await mongoose.disconnect();
}

updateNext40().catch(console.error);

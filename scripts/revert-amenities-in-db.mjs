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

const REVERT_MAP = {
  'Inverter': 'Power Backup',
  'inverter': 'Power Backup',
  'AC': 'Air Conditioner',
  'ac': 'Air Conditioner',
  'Cooler': 'Car Parking',
  'cooler': 'Car Parking',
  'Fan': 'Wi-Fi',
  'fan': 'Wi-Fi',
  'Bed': 'CCTV',
  'bed': 'CCTV'
};

async function revertAmenities() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  const db = mongoose.connection.db;

  const properties = await db.collection('properties').find({}).toArray();
  console.log(`Reverting ${properties.length} properties in database back to original amenities...`);

  let updatedCount = 0;

  for (const p of properties) {
    if (Array.isArray(p.amenities) && p.amenities.length > 0) {
      let changed = false;
      const originalAmenitiesSet = new Set();

      for (const a of p.amenities) {
        if (REVERT_MAP[a]) {
          originalAmenitiesSet.add(REVERT_MAP[a]);
          changed = true;
        } else {
          originalAmenitiesSet.add(a);
        }
      }

      if (changed) {
        const restoredAmenities = Array.from(originalAmenitiesSet);
        await db.collection('properties').updateOne(
          { _id: p._id },
          { $set: { amenities: restoredAmenities } }
        );
        updatedCount++;
      }
    }
  }

  console.log(`\nSuccessfully restored original amenities for ${updatedCount} properties in MongoDB!`);

  // Verify restored distribution
  const refreshed = await db.collection('properties').find({}).project({ amenities: 1 }).toArray();
  const freq = {};
  refreshed.forEach(p => {
    if (Array.isArray(p.amenities)) {
      p.amenities.forEach(a => {
        freq[a] = (freq[a] || 0) + 1;
      });
    }
  });

  console.log('\n--- RESTORED AMENITY DISTRIBUTION IN DATABASE ---');
  console.log(JSON.stringify(freq, null, 2));

  await mongoose.disconnect();
}

revertAmenities().catch(console.error);

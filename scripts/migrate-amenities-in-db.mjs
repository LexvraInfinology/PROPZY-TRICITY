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

const AMENITY_MAP = {
  'Power Backup': 'Inverter',
  'power backup': 'Inverter',
  'Air Conditioner': 'AC',
  'air conditioner': 'AC',
  'Car Parking': 'Cooler',
  'car parking': 'Cooler',
  'Wi-Fi': 'Fan',
  'Wifi': 'Fan',
  'wifi': 'Fan',
  'High-Speed Wi-Fi': 'Fan',
  'CCTV': 'Bed',
  'cctv': 'Bed'
};

async function migrateAmenities() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  const db = mongoose.connection.db;

  const properties = await db.collection('properties').find({}).toArray();
  console.log(`Checking ${properties.length} properties in database...`);

  let updatedCount = 0;

  for (const p of properties) {
    if (Array.isArray(p.amenities) && p.amenities.length > 0) {
      let changed = false;
      const newAmenitiesSet = new Set();

      for (const a of p.amenities) {
        if (AMENITY_MAP[a]) {
          newAmenitiesSet.add(AMENITY_MAP[a]);
          changed = true;
        } else {
          newAmenitiesSet.add(a);
        }
      }

      if (changed) {
        const updatedAmenities = Array.from(newAmenitiesSet);
        await db.collection('properties').updateOne(
          { _id: p._id },
          { $set: { amenities: updatedAmenities } }
        );
        updatedCount++;
      }
    }
  }

  console.log(`\nSuccessfully converted amenities for ${updatedCount} properties in MongoDB!`);

  // Verify new distribution
  const refreshed = await db.collection('properties').find({}).project({ amenities: 1 }).toArray();
  const freq = {};
  refreshed.forEach(p => {
    if (Array.isArray(p.amenities)) {
      p.amenities.forEach(a => {
        freq[a] = (freq[a] || 0) + 1;
      });
    }
  });

  console.log('\n--- NEW AMENITY DISTRIBUTION IN DATABASE ---');
  console.log(JSON.stringify(freq, null, 2));

  await mongoose.disconnect();
}

migrateAmenities().catch(console.error);

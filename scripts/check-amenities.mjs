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

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  const db = mongoose.connection.db;

  const props = await db.collection('properties').find({}).project({ pid: 1, amenities: 1 }).toArray();
  const amenityFrequency = {};
  props.forEach(p => {
    if (Array.isArray(p.amenities)) {
      p.amenities.forEach(a => {
        amenityFrequency[a] = (amenityFrequency[a] || 0) + 1;
      });
    }
  });

  console.log('Amenity distribution in DB:');
  console.log(JSON.stringify(amenityFrequency, null, 2));

  await mongoose.disconnect();
}

check().catch(console.error);

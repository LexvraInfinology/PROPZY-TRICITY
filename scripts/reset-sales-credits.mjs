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

async function resetSalesCredits() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  const db = mongoose.connection.db;

  const filter = {
    $or: [
      { role: { $in: ['sales executive', 'sales_executive'] } },
      { email: { $in: ['pawanpropzy@gmail.com', 'chandnirathore0963@gmail.com'] } }
    ]
  };

  const usersBefore = await db.collection('users').find(filter).toArray();
  console.log('Sales executives found before reset:', usersBefore.map(u => ({
    name: u.name,
    email: u.email,
    role: u.role,
    credits: u.credits,
    activePlan: u.activePlan
  })));

  const updateResult = await db.collection('users').updateMany(filter, {
    $set: {
      credits: 0,
      activePlan: 'None'
    }
  });

  console.log('Update result:', updateResult);

  const usersAfter = await db.collection('users').find(filter).toArray();
  console.log('Sales executives after reset:', usersAfter.map(u => ({
    name: u.name,
    email: u.email,
    role: u.role,
    credits: u.credits,
    activePlan: u.activePlan
  })));

  await mongoose.disconnect();
}

resetSalesCredits().catch(console.error);

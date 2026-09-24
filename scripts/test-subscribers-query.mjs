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

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  const filter = {
    role: { $nin: ['admin', 'sales executive', 'sales_executive'] },
    email: {
      $nin: [
        'pawanpropzy@gmail.com',
        'chandnirathore0963@gmail.com',
        (process.env.ADMIN_ID || 'admin@propzy.com').toLowerCase()
      ]
    },
    $or: [
      { activePlan: { $exists: true, $nin: ['Free', 'free', 'None', '', null] } },
      { credits: { $gt: 0 } }
    ]
  };

  const list = await mongoose.connection.db.collection('users').find(filter).toArray();
  console.log('Filtered subscribed tenants count:', list.length);
  for (const u of list) {
    console.log(`- ${u.name} (${u.email}): ${u.activePlan || 'No plan'}, ${u.credits} credits, role: ${u.role}`);
  }
  await mongoose.disconnect();
}

run().catch(console.error);

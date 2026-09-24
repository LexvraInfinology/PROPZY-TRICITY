import dns from 'dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

// Load .env.local
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

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  role: String,
  credits: Number,
  activePlan: String
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function testChandniAuth() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  const user = await User.findOne({ email: 'chandnirathore0963@gmail.com' });
  if (!user) {
    console.error('❌ User not found!');
    process.exit(1);
  }

  console.log('User found in DB:', {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    credits: user.credits,
    activePlan: user.activePlan
  });

  const correctMatch = await bcrypt.compare('Chandni@123', user.password);
  console.log('Password check with Chandni@123:', correctMatch ? '✅ MATCH SUCCESS' : '❌ FAILED');

  const wrongMatch = await bcrypt.compare('WrongPassword', user.password);
  console.log('Password check with WrongPassword:', !wrongMatch ? '✅ CORRECTLY REJECTED' : '❌ FAILED');

  await mongoose.disconnect();
}

testChandniAuth().catch(console.error);

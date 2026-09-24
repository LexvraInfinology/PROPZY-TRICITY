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
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String, default: '' },
  password: { type: String, default: '' },
  googleId: { type: String, default: '' },
  avatar: { type: String, default: '' },
  role: { type: String, default: 'sales executive' },
  city: { type: String, default: 'Mohali' },
  wishlist: { type: [String], default: [] },
  unlockedProperties: { type: [String], default: [] },
  ownerVerified: { type: Boolean, default: true },
  verificationStatus: { type: String, default: 'approved' },
  credits: { type: Number, default: 100 },
  activePlan: { type: String, default: 'Executive Pro' },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seedChandni() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  console.log('Connected to MongoDB Atlas successfully!\n');

  const email = 'chandnirathore0963@gmail.com';
  const name = 'Chandni';
  const role = 'sales executive';
  const rawPassword = 'Chandni@123';

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(rawPassword, salt);

  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Found existing user with email ${email}. Updating details...`);
    existing.name = name;
    existing.role = role;
    existing.password = hashedPassword;
    existing.ownerVerified = true;
    existing.verificationStatus = 'approved';
    existing.credits = 0;
    existing.activePlan = 'None';
    await existing.save();
    console.log('Updated user:', {
      id: existing._id,
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
      role: existing.role
    });
  } else {
    console.log(`Creating new user with email ${email}...`);
    const newUser = await User.create({
      name,
      email,
      phone: '',
      password: hashedPassword,
      role,
      city: 'Mohali',
      ownerVerified: true,
      verificationStatus: 'approved',
      credits: 0,
      activePlan: 'None'
    });
    console.log('Created user successfully:', {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      activePlan: newUser.activePlan,
      credits: newUser.credits
    });
  }

  console.log('\n=============================================');
  console.log('Credentials added successfully:');
  console.log(`- Name:     ${name}`);
  console.log(`- Email:    ${email}`);
  console.log(`- Password: ${rawPassword}`);
  console.log(`- Role:     ${role}`);
  console.log('=============================================\n');

  await mongoose.disconnect();
  console.log('MongoDB connection closed.');
}

seedChandni().catch((err) => {
  console.error('Error seeding user:', err);
  process.exit(1);
});

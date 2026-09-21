import dns from 'dns';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e){}

const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...rest] = trimmed.split('=');
    if (key && !process.env[key.trim()]) process.env[key.trim()] = rest.join('=').trim();
  }
});

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  const props = await mongoose.connection.db.collection('properties').find({
    $or: [
      { pid: /771179/ },
      { pid: /223622/ },
      { locality: /Adarsh Nagar/i }
    ]
  }).toArray();
  console.log(JSON.stringify(props.map(p => ({
    _id: p._id,
    pid: p.pid,
    title: p.title,
    locality: p.locality,
    city: p.city,
    price: p.price,
    ownerName: p.ownerName,
    ownerEmail: p.ownerEmail,
    ownerPhone: p.ownerPhone,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    images: p.images
  })), null, 2));
  await mongoose.disconnect();
}
run().catch(console.error);

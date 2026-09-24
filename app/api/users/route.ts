import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Property from '@/models/Property';
import { memoryUsers } from '@/lib/memoryStore';
import { getAuthUser } from '@/lib/auth';
import { isBrowserDocumentNavigation } from '@/lib/accessControl';

function countUserProperties(u: any, properties: any[]): number {
  if (!properties || properties.length === 0) {
    return Array.isArray(u.postedProperties) ? u.postedProperties.length : 0;
  }

  const uEmail = (u.email || '').toLowerCase().trim();
  const uPhone = (u.phone || '').replace(/\D/g, '');
  const uName = (u.name || '').toLowerCase().trim();
  const uFirst = uName ? uName.split(' ')[0] : '';
  const postedSet = new Set(
    Array.isArray(u.postedProperties)
      ? u.postedProperties.map((p: any) => String(p).trim().toLowerCase())
      : []
  );

  const matched = properties.filter((p: any) => {
    // 1. Explicit PID or _id in postedProperties
    if (p.pid && postedSet.has(String(p.pid).toLowerCase())) return true;
    if (p._id && postedSet.has(String(p._id).toLowerCase())) return true;

    // 2. Strict Email Match (most reliable)
    const pEmail = (p.ownerEmail || '').toLowerCase().trim();
    if (uEmail && pEmail && uEmail === pEmail) {
      return true;
    }

    // 3. Clean Phone Match
    const pPhone = (p.ownerPhone || '').replace(/\D/g, '');
    const isDummyPhone = uPhone === '9876543210' || uPhone.length < 10;
    if (!isDummyPhone && uPhone.length >= 10 && uPhone === pPhone) {
      const pName = (p.ownerName || '').toLowerCase().trim();
      const pFirst = pName ? pName.split(' ')[0] : '';
      if (!uFirst || !pFirst || uFirst === pFirst) {
        return true;
      }
    }

    // 4. Full Name Match (if ownerEmail is unassigned or matches)
    const pName = (p.ownerName || '').toLowerCase().trim();
    if (uName && pName && uName === pName) {
      if (!pEmail || pEmail === uEmail) {
        return true;
      }
    }

    return false;
  });

  return Math.max(matched.length, postedSet.size);
}

export async function GET(req: NextRequest) {
  try {
    // 1. If direct browser navigation, do not expose API data - return 404
    if (isBrowserDocumentNavigation(req)) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    // 2. Strict admin authorization check - regular users / guests get 404 Not Found
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }

    let dbConnected = false;
    let dbUsers: any[] = [];
    let dbProperties: any[] = [];

    try {
      await connectToDatabase();
      dbConnected = true;
    } catch (err: any) {}

    if (dbConnected) {
      try {
        [dbUsers, dbProperties] = await Promise.all([
          User.find({}).sort({ createdAt: -1 }).lean(),
          Property.find({}, 'pid ownerEmail ownerPhone ownerName').lean()
        ]);
      } catch (err: any) {}
    }

    // Map DB users with dynamic property counts
    const mappedDbUsers = dbUsers.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role === 'owner' ? 'owner' : u.role === 'admin' ? 'admin' : (u.role === 'sales executive' || u.role === 'sales_executive') ? 'sales executive' : 'tenant',
      ownerVerified: u.ownerVerified || false,
      status: 'Active',
      propertiesCount: countUserProperties(u, dbProperties),
      createdAt: u.createdAt || new Date()
    }));

    // Map memory users not present in DB
    const existingEmails = new Set(mappedDbUsers.map(u => u.email.toLowerCase()));
    const mappedMemUsers = memoryUsers
      .filter(m => !existingEmails.has(m.email.toLowerCase()))
      .map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        role: (m.role as string) === 'owner' ? 'owner' : (m.role as string) === 'admin' ? 'admin' : ((m.role as string) === 'sales executive' || (m.role as string) === 'sales_executive') ? 'sales executive' : 'tenant',
        ownerVerified: m.ownerVerified || false,
        status: 'Active',
        propertiesCount: countUserProperties(m, dbProperties),
        createdAt: new Date()
      }));

    const combinedUsers = [...mappedDbUsers, ...mappedMemUsers];

    return NextResponse.json({
      success: true,
      data: combinedUsers,
      source: dbConnected ? 'database' : 'memory'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  }
}

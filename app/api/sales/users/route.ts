import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { isSalesOrAdmin, isBrowserDocumentNavigation } from '@/lib/accessControl';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (isBrowserDocumentNavigation(req)) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  }

  try {
    const authUser = await getAuthUser(req);
    if (!authUser || !isSalesOrAdmin(authUser)) {
      return NextResponse.json(
        { success: false, message: 'Access restricted to authorized sales and admin personnel.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim();
    const role = searchParams.get('role')?.trim()?.toLowerCase();

    const filter: any = {};

    if (role && role !== 'all') {
      if (role === 'owner') {
        filter.role = { $in: ['owner', 'landlord'] };
      } else if (role === 'tenant') {
        filter.role = { $in: ['tenant', 'user'] };
      } else if (role === 'admin') {
        filter.role = 'admin';
      } else if (role === 'sales' || role === 'sales_executive' || role === 'sales executive') {
        filter.role = { $in: ['sales_executive', 'sales executive'] };
      }
    }

    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: new RegExp(safe, 'i') },
        { email: new RegExp(safe, 'i') },
        { phone: new RegExp(safe, 'i') },
        { city: new RegExp(safe, 'i') }
      ];
    }

    // Strictly project safe read-only fields; completely omit password hashes, tokens, bills
    const projection = '_id name email phone role city activePlan credits createdAt';

    const users = await User.find(filter)
      .select(projection)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
      .exec();

    const formatted = users.map((u: any) => {
      const roleRaw = (u.role || '').toLowerCase();
      const normalizedRole = roleRaw.includes('admin')
        ? 'Admin'
        : roleRaw.includes('sales')
        ? 'Sales Executive'
        : roleRaw.includes('owner') || roleRaw.includes('landlord')
        ? 'Owner'
        : 'Tenant';

      return {
        id: u._id.toString(),
        name: u.name || 'User',
        email: u.email || '',
        phone: u.phone || '',
        role: normalizedRole,
        rawRole: u.role,
        city: u.city || 'Mohali',
        activePlan: u.activePlan || 'Free',
        credits: typeof u.credits === 'number' ? u.credits : 0,
        createdAt: u.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
      count: formatted.length
    });
  } catch (err: any) {
    console.error('[API Sales Users] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve user directory.' },
      { status: 500 }
    );
  }
}

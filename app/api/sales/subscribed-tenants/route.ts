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

    // Query paying or active credit-holding TENANTS (strictly exclude admin & sales executive staff)
    const baseConditions: any = {
      role: { $nin: ['admin', 'sales executive', 'sales_executive'] },
      email: {
        $nin: [
          'pawanpropzy@gmail.com',
          'chandnirathore0963@gmail.com',
          (process.env.ADMIN_ID || 'admin@propzy.com').toLowerCase().trim()
        ]
      },
      $or: [
        { activePlan: { $exists: true, $nin: ['Free', 'free', 'None', '', null] } },
        { credits: { $gt: 0 } }
      ]
    };

    let filter: any = baseConditions;

    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchOr = [
        { name: new RegExp(safe, 'i') },
        { email: new RegExp(safe, 'i') },
        { phone: new RegExp(safe, 'i') }
      ];
      filter = {
        $and: [
          baseConditions,
          { $or: searchOr }
        ]
      };
    }

    const projection = '_id name email phone role city credits activePlan planExpiresAt billingHistory createdAt';

    const subscribers = await User.find(filter)
      .select(projection)
      .sort({ credits: -1, createdAt: -1 })
      .lean()
      .exec();

    const formatted = subscribers.map((sub: any) => ({
      id: sub._id.toString(),
      name: sub.name || 'Tenant',
      email: sub.email || '',
      phone: sub.phone || '',
      role: sub.role || 'tenant',
      city: sub.city || 'Mohali',
      credits: typeof sub.credits === 'number' ? sub.credits : 0,
      activePlan: sub.activePlan || (sub.credits > 0 ? 'Custom Credits' : 'Free'),
      planExpiresAt: sub.planExpiresAt || null,
      totalInvoices: Array.isArray(sub.billingHistory) ? sub.billingHistory.length : 0,
      createdAt: sub.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      count: formatted.length
    });
  } catch (err: any) {
    console.error('[API Sales Subscribed Tenants] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve subscriber records.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Property from '@/models/Property';
import { getAuthUser } from '@/lib/auth';
import { isSalesOrAdmin, isBrowserDocumentNavigation } from '@/lib/accessControl';

export const runtime = 'nodejs';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

    const conn = await connectToDatabase();
    const PropertyModel = conn.models.Property || Property;

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const search = searchParams.get('search');
    const bedrooms = searchParams.get('bedrooms');

    const filter: any = {
      // Sales view displays verified listings by default
      verified: true,
      available: { $ne: false }
    };

    if (city && city !== 'all') {
      filter.city = new RegExp(escapeRegex(city), 'i');
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (bedrooms && bedrooms !== 'all') {
      const num = Number(bedrooms);
      if (!isNaN(num)) {
        filter.bedrooms = num;
      }
    }

    if (search) {
      const safe = escapeRegex(search.trim());
      filter.$or = [
        { title: new RegExp(safe, 'i') },
        { locality: new RegExp(safe, 'i') },
        { city: new RegExp(safe, 'i') },
        { pid: new RegExp(safe, 'i') },
        { ownerName: new RegExp(safe, 'i') },
        { ownerPhone: new RegExp(safe, 'i') }
      ];
    }

    // Projects unmasked owner contact details for sales calling
    const projection = 'pid title category type city locality address price deposit bedrooms bathrooms areaSqFt furnishing verified featured images videos videoThumbnail ownerName ownerPhone ownerEmail ownerRole available createdAt';

    const properties = await PropertyModel.find(filter)
      .select(projection)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
      .exec();

    const formatted = properties.map((p: any) => ({
      ...p,
      _id: p._id?.toString?.() || p._id,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      count: formatted.length
    });
  } catch (err: any) {
    console.error('[API Sales Properties] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve property calling directory.' },
      { status: 500 }
    );
  }
}

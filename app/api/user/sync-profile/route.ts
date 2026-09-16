import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const { email } = await req.json().catch(() => ({}));
    const targetEmail = (email ? String(email) : authUser.email).toLowerCase().trim();

    // Only allow syncing the authenticated user's profile, unless an admin is requesting
    if (authUser.role !== 'admin' && authUser.email.toLowerCase().trim() !== targetEmail) {
      return NextResponse.json({ success: false, message: 'Forbidden. You can only sync your own profile.' }, { status: 403 });
    }

    try {
      await connectToDatabase();
      const dbUser: any = await User.findOne({ email: targetEmail }).select('-password').lean();

      if (dbUser) {
        const currentWishlist: string[] = dbUser.wishlist || [];
        let sanitizedWishlist = currentWishlist;

        if (currentWishlist.length > 0) {
          const Property = (await import('@/models/Property')).default;
          const existingProps = await Property.find({
            $or: [
              { pid: { $in: currentWishlist } },
              { _id: { $in: currentWishlist.filter((id: string) => id.match(/^[0-9a-fA-F]{24}$/)) } }
            ]
          }).select('pid _id').lean();

          const validPids = new Set<string>();
          existingProps.forEach((p: any) => {
            if (p.pid) validPids.add(p.pid);
            if (p._id) validPids.add(p._id.toString());
          });

          sanitizedWishlist = currentWishlist.filter((id: string) => validPids.has(id));

          if (sanitizedWishlist.length !== currentWishlist.length) {
            await User.updateOne({ _id: dbUser._id }, { $set: { wishlist: sanitizedWishlist } });
          }
        }

        const userRole = dbUser.role || 'tenant';

        const userProfile = {
          id: dbUser._id?.toString(),
          name: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone,
          role: userRole,
          city: dbUser.city || 'Mohali',
          wishlist: sanitizedWishlist,
          unlockedProperties: Array.isArray(dbUser.unlockedProperties) ? dbUser.unlockedProperties : [],
          ownerVerified: dbUser.ownerVerified || false,
          verificationStatus: dbUser.verificationStatus || 'none',
          electricityBillUrl: dbUser.electricityBillUrl || '',
          consumerNumber: dbUser.consumerNumber || '',
          credits: typeof dbUser.credits === 'number' ? dbUser.credits : 0,
          activePlan: dbUser.activePlan || 'Free',
          planExpiresAt: dbUser.planExpiresAt ? (typeof dbUser.planExpiresAt.toISOString === 'function' ? dbUser.planExpiresAt.toISOString() : String(dbUser.planExpiresAt)) : undefined,
          billingHistory: Array.isArray(dbUser.billingHistory) ? dbUser.billingHistory : []
        };

        return NextResponse.json({ success: true, user: userProfile });
      }
    } catch (dbErr: any) {
      console.warn('Sync profile MongoDB warning:', dbErr.message);
    }

    return NextResponse.json({ success: false, message: 'User not found in DB' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

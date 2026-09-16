import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    try {
      await connectToDatabase();
      const dbUser: any = await User.findById(authUser.id).select('-password').lean();
      if (dbUser) {
        const rawWishlist: string[] = dbUser.wishlist || [];
        let validWishlist = rawWishlist;
        if (rawWishlist.length > 0) {
          const Property = (await import('@/models/Property')).default;
          const existingProps = await Property.find({
            $or: [
              { pid: { $in: rawWishlist } },
              { _id: { $in: rawWishlist.filter((id: string) => id.match(/^[0-9a-fA-F]{24}$/)) } }
            ]
          }).select('pid _id').lean();

          const validPids = new Set<string>();
          existingProps.forEach((p: any) => {
            if (p.pid) validPids.add(p.pid);
            if (p._id) validPids.add(p._id.toString());
          });

          validWishlist = rawWishlist.filter((id: string) => validPids.has(id));

          if (validWishlist.length !== rawWishlist.length) {
            await User.updateOne({ _id: dbUser._id }, { $set: { wishlist: validWishlist } });
          }
        }

        const userRole = dbUser.role || 'tenant';

        return NextResponse.json({
          success: true,
          user: {
            id: dbUser._id.toString(),
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone,
            role: userRole,
            city: dbUser.city || 'Mohali',
            wishlist: validWishlist,
            unlockedProperties: Array.isArray(dbUser.unlockedProperties) ? dbUser.unlockedProperties : [],
            ownerVerified: dbUser.ownerVerified || false,
            verificationStatus: dbUser.verificationStatus || 'none',
            electricityBillUrl: dbUser.electricityBillUrl || '',
            consumerNumber: dbUser.consumerNumber || '',
            credits: typeof dbUser.credits === 'number' ? dbUser.credits : 0,
            activePlan: dbUser.activePlan || 'Free',
            planExpiresAt: dbUser.planExpiresAt ? (typeof dbUser.planExpiresAt.toISOString === 'function' ? dbUser.planExpiresAt.toISOString() : String(dbUser.planExpiresAt)) : undefined,
            billingHistory: Array.isArray(dbUser.billingHistory) ? dbUser.billingHistory : []
          }
        });
      }
    } catch (dbErr) {
      // Fallback to token payload if DB is temporarily unreachable
    }

    return NextResponse.json({
      success: true,
      user: authUser
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

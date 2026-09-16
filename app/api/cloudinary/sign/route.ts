import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { generateUploadSignature } from '@/lib/cloudinary';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    let authUser = await getAuthUser(req);
    let requestBody: any = {};

    try {
      requestBody = await req.json();
    } catch (_) {
      // Body may be empty if called without payload
    }

    // If cookie-based authUser is missing, verify user from request payload via MongoDB
    if (!authUser && requestBody?.email) {
      try {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: requestBody.email.trim().toLowerCase() }).lean();
        if (dbUser) {
          authUser = {
            id: (dbUser as any)._id.toString(),
            name: (dbUser as any).name,
            email: (dbUser as any).email,
            role: (dbUser as any).role || 'owner'
          };
        }
      } catch (dbErr) {
        console.warn('[Cloudinary Sign] DB fallback user lookup error:', dbErr);
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please login to upload property images.' },
        { status: 401 }
      );
    }

    if (authUser.role === 'tenant') {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Tenants cannot post property listings.' },
        { status: 403 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, isConfigured: false, message: 'Cloudinary credentials are not configured. Using client optimization fallback.' },
        { status: 200 }
      );
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const resourceType = requestBody?.resourceType === 'video' ? 'video' : 'image';
    const folder = resourceType === 'video' ? 'letsrentz/videos' : 'letsrentz/properties';

    // Parameters to sign must match exactly the parameters sent in the upload request
    const paramsToSign: Record<string, string | number> = {
      folder,
      timestamp,
    };

    const signature = generateUploadSignature(paramsToSign);

    return NextResponse.json({
      success: true,
      isConfigured: true,
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      resourceType,
    });
  } catch (error: any) {
    console.warn('Notice: Cloudinary upload signature bypassed, using local fallback:', error?.message);
    return NextResponse.json(
      { success: false, isConfigured: false, message: error?.message || 'Using local image optimization fallback' },
      { status: 200 }
    );
  }
}

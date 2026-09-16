import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Property from '@/models/Property';
import { getAuthUser } from '@/lib/auth';
import { canViewPropertyContactDetails, isAdminUser, isBrowserDocumentNavigation, isOwnedByUser, serializeProperty } from '@/lib/accessControl';
import { clearPropertiesCache } from '@/lib/propertiesCache';
import { extractPublicIdFromUrl, deleteCloudinaryImage, deleteCloudinaryVideo, getVideoThumbnailUrl, uploadBase64ImagesToCloudinary } from '@/lib/cloudinary';
import { redisGet, redisSet, redisDel } from '@/lib/redis';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isBrowserDocumentNavigation(req)) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  }

  const { id } = await params;
  const authUser = await getAuthUser(req);
  const isGuest = !authUser;
  const singleCacheKey = `prop:single:${id.toLowerCase()}`;

  // Check Redis for unauthenticated public guests
  if (isGuest) {
    try {
      const cached = await redisGet<any>(singleCacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: { 'X-Cache-Status': 'REDIS-HIT' }
        });
      }
    } catch {}
  }

  try {
    await connectToDatabase();
    
    const normalizedPz = id.startsWith('prop-') ? `PZ-${id.replace('prop-', '')}` : id.startsWith('LR-') ? `PZ-${id.replace('LR-', '')}` : id;
    const normalizedLr = id.startsWith('prop-') ? `LR-${id.replace('prop-', '')}` : id.startsWith('PZ-') ? `LR-${id.replace('PZ-', '')}` : id;

    let property = await Property.findOne({
      $or: [{ pid: id }, { pid: normalizedPz }, { pid: normalizedLr }, { id: id }]
    });

    if (!property && id.match(/^[0-9a-fA-F]{24}$/)) {
      property = await Property.findById(id).catch(() => null);
    }

    if (property) {
      const isOwner = isOwnedByUser(property.ownerEmail, authUser);
      const isAdmin = isAdminUser(authUser);
      const isPubliclyAvailable = property.verified && property.available !== false;
      const canAccess = isPubliclyAvailable || isAdmin || isOwner;

      if (!canAccess) {
        return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
      }

      const responsePayload = {
        success: true,
        data: serializeProperty(property, canViewPropertyContactDetails(property, authUser))
      };

      // Cache active verified property response in Redis for guests (5 min TTL)
      if (isGuest && isPubliclyAvailable) {
        await redisSet(singleCacheKey, responsePayload, 300);
      }

      return NextResponse.json(responsePayload);
    }
  } catch (err) {
    console.warn('Single property fetch error:', err);
  }

  return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const authUser = await getAuthUser(req);

  if (!authUser) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Please login.' }, { status: 401 });
  }

  const normalizedPz = id.startsWith('prop-') ? `PZ-${id.replace('prop-', '')}` : id.startsWith('LR-') ? `PZ-${id.replace('LR-', '')}` : id;
  const normalizedLr = id.startsWith('prop-') ? `LR-${id.replace('prop-', '')}` : id.startsWith('PZ-') ? `LR-${id.replace('PZ-', '')}` : id;

  const queryFilter: any = [{ pid: id }, { pid: normalizedPz }, { pid: normalizedLr }, { id: id }];
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    queryFilter.push({ _id: id });
  }

  const isAdmin = isAdminUser(authUser);
  let sanitizedBody: any = {};

  if (isAdmin) {
    sanitizedBody = { ...body };
  } else {
    // Whitelist only owner-editable fields to prevent privilege escalation
    const allowedFields = [
      'title', 'category', 'type', 'commercialSubType',
      'city', 'locality', 'address',
      'price', 'deposit', 'bedrooms', 'bathrooms', 'areaSqFt', 'furnishing',
      'description', 'amenities',
      'images', 'videos', 'videoThumbnail',
      'available', 'ownerName', 'ownerPhone'
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        sanitizedBody[field] = body[field];
      }
    }
  }

  if (sanitizedBody.areaSqFt !== undefined) {
    sanitizedBody.areaSqFt = sanitizedBody.areaSqFt && Number(sanitizedBody.areaSqFt) > 0 ? Number(sanitizedBody.areaSqFt) : null;
  }

  if (sanitizedBody.price !== undefined) {
    const str = String(sanitizedBody.price).trim();
    if (str.includes('-')) {
      sanitizedBody.price = str;
    } else {
      const num = Number(str.replace(/,/g, '').trim());
      sanitizedBody.price = isNaN(num) ? str : num;
    }
  }

  if (sanitizedBody.deposit !== undefined) {
    const str = String(sanitizedBody.deposit).trim();
    if (str.includes('-')) {
      sanitizedBody.deposit = str;
    } else {
      const num = Number(str.replace(/,/g, '').trim());
      sanitizedBody.deposit = isNaN(num) ? str : num;
    }
  }

  // Upload any new base64 images to Cloudinary before saving to MongoDB
  if (sanitizedBody.images && Array.isArray(sanitizedBody.images)) {
    try {
      sanitizedBody.images = await uploadBase64ImagesToCloudinary(sanitizedBody.images);
    } catch (uploadErr) {
      console.warn('Failed to upload some images to Cloudinary in PATCH:', uploadErr);
    }
  }

  // Handle videos in PATCH
  if (sanitizedBody.videos !== undefined) {
    sanitizedBody.videos = Array.isArray(sanitizedBody.videos)
      ? sanitizedBody.videos.filter((v: string) => typeof v === 'string' && v.trim().length > 0)
      : (typeof sanitizedBody.video === 'string' && sanitizedBody.video.trim().length > 0) ? [sanitizedBody.video.trim()] : [];
    if (!sanitizedBody.videoThumbnail && sanitizedBody.videos.length > 0) {
      sanitizedBody.videoThumbnail = getVideoThumbnailUrl(sanitizedBody.videos[0]);
    }
  }

  let updated: any = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await connectToDatabase(attempt === 2);

      let existing: any = await Property.findOne({ $or: queryFilter }).lean();
      if (!existing && id.match(/^[0-9a-fA-F]{24}$/)) {
        existing = await Property.findById(id).lean().catch(() => null);
      }

      if (existing) {
        if (!isAdmin && !isOwnedByUser(existing.ownerEmail, authUser)) {
          return NextResponse.json({ success: false, message: 'Forbidden. You can only modify your own property listing.' }, { status: 403 });
        }
      }

      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        updated = await Property.findByIdAndUpdate(
          id,
          { $set: sanitizedBody },
          { new: true }
        );
      }
      if (!updated) {
        updated = await Property.findOneAndUpdate(
          { $or: queryFilter },
          { $set: sanitizedBody },
          { new: true }
        );
      }
      break;
    } catch (err: any) {
      console.warn(`[PATCH Property] Attempt ${attempt} failed:`, err?.message);
      if (attempt === 1) {
        continue;
      }
    }
  }

  // Invalidate server-side property listings and single property cache
  await clearPropertiesCache();
  try {
    await redisDel(`prop:single:${id.toLowerCase()}`);
    await redisDel(`prop:single:${normalizedPz.toLowerCase()}`);
    await redisDel(`prop:single:${normalizedLr.toLowerCase()}`);
  } catch {}

  if (updated) {
    return NextResponse.json({ 
      success: true, 
      data: serializeProperty(updated, true) 
    });
  }

  return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = await getAuthUser(req);

  if (!authUser) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Please login.' }, { status: 401 });
  }

  const normalizedPz = id.startsWith('prop-') ? `PZ-${id.replace('prop-', '')}` : id.startsWith('LR-') ? `PZ-${id.replace('LR-', '')}` : id;
  const normalizedLr = id.startsWith('prop-') ? `LR-${id.replace('prop-', '')}` : id.startsWith('PZ-') ? `LR-${id.replace('PZ-', '')}` : id;

  const queryFilter: any = [{ pid: id }, { pid: normalizedPz }, { pid: normalizedLr }, { id: id }];
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    queryFilter.push({ _id: id });
  }

  let deleted: any = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await connectToDatabase(attempt === 2);

      let existing: any = await Property.findOne({ $or: queryFilter }).lean();
      if (!existing && id.match(/^[0-9a-fA-F]{24}$/)) {
        existing = await Property.findById(id).lean().catch(() => null);
      }

      if (existing) {
        if (!isAdminUser(authUser) && !isOwnedByUser(existing.ownerEmail, authUser)) {
          return NextResponse.json({ success: false, message: 'Forbidden. You can only delete your own property listing.' }, { status: 403 });
        }

        deleted = await Property.findOneAndDelete({ $or: queryFilter });
        if (!deleted && id.match(/^[0-9a-fA-F]{24}$/)) {
          deleted = await Property.findByIdAndDelete(id);
        }

        // Safely delete associated Cloudinary images
        if (existing.images && Array.isArray(existing.images)) {
          await Promise.allSettled(
            existing.images.map(async (imgUrl: string) => {
              const publicId = extractPublicIdFromUrl(imgUrl);
              if (publicId) {
                await deleteCloudinaryImage(publicId);
              }
            })
          ).catch(err => console.warn('[Cloudinary Cleanup Error]:', err));
        }

        // Safely delete associated Cloudinary videos
        if (existing.videos && Array.isArray(existing.videos)) {
          await Promise.allSettled(
            existing.videos.map(async (vidUrl: string) => {
              const publicId = extractPublicIdFromUrl(vidUrl);
              if (publicId) {
                await deleteCloudinaryVideo(publicId);
              }
            })
          ).catch(err => console.warn('[Cloudinary Video Cleanup Error]:', err));
        }
      }
      break;
    } catch (err: any) {
      console.warn(`[DELETE Property] Attempt ${attempt} failed:`, err?.message);
      if (attempt === 1) {
        continue;
      }
    }
  }

  // Invalidate server-side property listings and single property cache
  await clearPropertiesCache();

  if (deleted) {
    return NextResponse.json({ success: true, data: serializeProperty(deleted, true) });
  }

  return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 });
}

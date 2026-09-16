import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary server-side instance
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Generates a signed upload signature for secure direct client-to-Cloudinary uploads.
 * This ensures credentials (API Secret) remain on the server, while allowing fast browser uploads.
 */
export function generateUploadSignature(paramsToSign: Record<string, string | number>) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    throw new Error('CLOUDINARY_API_SECRET is not configured in environment variables');
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
  return signature;
}

/**
 * Extracts Cloudinary public_id from a secure Cloudinary image URL.
 * Example URL:
 * https://res.cloudinary.com/tyuautgp/image/upload/v1723981234/letsrentz/properties/photo_abc123.jpg
 * Returns: letsrentz/properties/photo_abc123
 */
export function extractPublicIdFromUrl(url: string): string | null {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
    return null;
  }

  try {
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    const afterUpload = url.substring(uploadIndex + '/upload/'.length);
    const cleanPath = afterUpload.split('?')[0].split('#')[0];
    const segments = cleanPath.split('/');

    let startIndex = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (/^v\d+$/.test(seg)) {
        startIndex = i + 1;
        break;
      }
      if (/^[a-z]{1,2}_|,/.test(seg)) {
        startIndex = i + 1;
      } else {
        break;
      }
    }

    const publicPathWithExt = segments.slice(startIndex).join('/');
    const lastDotIndex = publicPathWithExt.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      return publicPathWithExt.substring(0, lastDotIndex);
    }
    return publicPathWithExt || null;
  } catch (err) {
    console.warn('Failed to extract public_id from Cloudinary URL:', url, err);
  }

  return null;
}

/**
 * Automatically uploads any Base64 data URLs in an image array to Cloudinary
 * and returns the array with all Base64 strings replaced with secure HTTPS Cloudinary URLs.
 */
export async function uploadBase64ImagesToCloudinary(images: string[], folder = 'letsrentz/properties'): Promise<string[]> {
  if (!Array.isArray(images) || images.length === 0) return [];

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const isConfigured = Boolean(cloudName && apiKey && apiSecret);

  const processedImages: string[] = [];

  for (const img of images) {
    if (typeof img === 'string' && img.startsWith('data:image/')) {
      if (isConfigured) {
        try {
          const res = await cloudinary.uploader.upload(img, {
            folder,
            resource_type: 'image',
          });
          if (res?.secure_url) {
            processedImages.push(res.secure_url);
            continue;
          }
        } catch (uploadErr: any) {
          console.error('[Cloudinary Auto-Upload Error]:', uploadErr?.message);
        }
      }
      // If upload failed or not configured, keep img
      processedImages.push(img);
    } else if (typeof img === 'string' && img.trim().length > 0) {
      processedImages.push(img.trim());
    }
  }

  return processedImages;
}

/**
 * Safely destroys an image on Cloudinary by its publicId.
 */
export async function deleteCloudinaryImage(publicId: string) {
  if (!publicId) return null;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error: any) {
    console.warn(`[Cloudinary] Failed to delete image ${publicId}:`, error.message);
    return null;
  }
}

/**
 * Safely destroys a video on Cloudinary by its publicId.
 */
export async function deleteCloudinaryVideo(publicId: string) {
  if (!publicId) return null;
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video',
      invalidate: true,
    });
    return result;
  } catch (error: any) {
    console.warn(`[Cloudinary] Failed to delete video ${publicId}:`, error.message);
    return null;
  }
}

/**
 * Returns an optimized poster/thumbnail URL for a video.
 * Supports Cloudinary video URLs, YouTube, and fallback placeholders.
 */
export function getVideoThumbnailUrl(videoUrl: string): string {
  if (!videoUrl || typeof videoUrl !== 'string') return '';

  const cleanUrl = videoUrl.trim();

  // Cloudinary video URL: transform extension to .jpg with start-offset 0
  if (cleanUrl.includes('res.cloudinary.com')) {
    // If it's already an image URL, return as is
    if (/\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(cleanUrl)) return cleanUrl;

    // Replace video extension with .jpg and add auto quality/first frame transformation if not present
    return cleanUrl
      .replace(/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i, '.jpg')
      .replace('/video/upload/', '/video/upload/so_0,q_auto,f_auto/');
  }

  // YouTube standard / shorts / embed URLs
  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  return '';
}

export default cloudinary;


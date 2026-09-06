import { v2 as cloudinary } from 'cloudinary';

const hasCredentials = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
);

const configure = () => {
  if (!hasCredentials()) return false;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return true;
};

export const isCloudinaryConfigured = () => configure();

export function uploadToCloudinary(buffer: Buffer, options: { folder: string; resourceType: 'image' | 'video' }) {
  return new Promise<{ secure_url: string; public_id: string; resource_type: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: options.folder, resource_type: options.resourceType },
      (error, result) => {
        if (error || !result) reject(error || new Error('Cloudinary upload failed'));
        else resolve({ secure_url: result.secure_url, public_id: result.public_id, resource_type: result.resource_type });
      },
    );
    stream.end(buffer);
  });
}

export function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'video') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
}

export function cloudinaryPublicIdFromUrl(url: string) {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  return match?.[1]?.replace(/\.[^/.]+$/, '') || null;
}

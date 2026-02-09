import { supabase } from '@/integrations/supabase/client';
import imageCompression from 'browser-image-compression';

const CDN_HOSTNAME = 'menuss.b-cdn.net';

// ============ Image Compression Options ============

const COVER_COMPRESSION_OPTIONS = {
  maxSizeMB: 3,
  maxWidthOrHeight: 2400,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.95,
};

const LOGO_COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.9,
};

const PRODUCT_COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.85,
};

export type ImageType = 'cover' | 'logo' | 'product';

function getCompressionOptions(imageType: ImageType) {
  switch (imageType) {
    case 'cover':
      return COVER_COMPRESSION_OPTIONS;
    case 'logo':
      return LOGO_COMPRESSION_OPTIONS;
    case 'product':
    default:
      return PRODUCT_COMPRESSION_OPTIONS;
  }
}

// ============ Progress Callback Types ============
export interface UploadProgress {
  stage: 'compressing' | 'uploading' | 'done';
  progress: number;
  message: string;
}

export type ProgressCallback = (progress: UploadProgress) => void;

async function compressImage(
  file: File,
  imageType: ImageType = 'product',
  onProgress?: ProgressCallback
): Promise<File> {
  try {
    const options = getCompressionOptions(imageType);
    console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB, Type: ${imageType}`);

    onProgress?.({
      stage: 'compressing',
      progress: 0,
      message: 'جاري ضغط الصورة...'
    });

    const compressedFile = await imageCompression(file, {
      ...options,
      onProgress: (percent) => {
        onProgress?.({
          stage: 'compressing',
          progress: Math.round(percent),
          message: `جاري ضغط الصورة... ${Math.round(percent)}%`
        });
      }
    });

    console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Compression error:', error);
    return file;
  }
}

// ============ Image URL Functions ============

export function getOptimizedUrl(url: string | null | undefined, _options?: { width?: number }): string {
  return url || '';
}

export function getCoverImageUrl(url: string | null | undefined): string {
  return url || '';
}

export function getLogoUrl(url: string | null | undefined): string {
  return url || '';
}

export function getMenuItemUrl(
  url: string | null | undefined,
  _size: 'thumbnail' | 'medium' | 'large' = 'medium'
): string {
  return url || '';
}

// ============ Upload & Delete ============

interface BunnyUploadResponse {
  secure_url: string;
  public_id: string;
}

export async function uploadToBunny(
  file: File,
  publicId: string,
  imageType: ImageType = 'product',
  onProgress?: ProgressCallback
): Promise<BunnyUploadResponse> {
  try {
    const compressedFile = await compressImage(file, imageType, onProgress);

    const path = `${publicId}_${Date.now()}.webp`;

    onProgress?.({
      stage: 'uploading',
      progress: 0,
      message: 'جاري رفع الصورة...'
    });

    const formData = new FormData();
    formData.append('file', compressedFile);
    formData.append('path', path);

    const { data, error } = await supabase.functions.invoke('bunny-upload', {
      body: formData,
    });

    if (error) {
      console.error('Bunny upload error:', error);
      throw new Error(`فشل رفع الصورة: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'فشل رفع الصورة');
    }

    onProgress?.({
      stage: 'done',
      progress: 100,
      message: 'تم رفع الصورة بنجاح!'
    });

    return {
      secure_url: data.url,
      public_id: data.path,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export async function deleteFromBunny(path: string): Promise<boolean> {
  if (!path) {
    console.log('No path provided, skipping delete');
    return true;
  }

  try {
    console.log('Deleting from Bunny:', path);

    const { data, error } = await supabase.functions.invoke('bunny-delete', {
      body: { path },
    });

    if (error) {
      console.error('Error deleting from Bunny:', error);
      return false;
    }

    return data?.success || false;
  } catch (error) {
    console.error('Delete exception:', error);
    return false;
  }
}

// ============ Path Generators ============

export function getCoverPublicId(restaurantUsername: string): string {
  return `restaurants/${restaurantUsername}/cover`;
}

export function getLogoPublicId(restaurantUsername: string): string {
  return `restaurants/${restaurantUsername}/logo`;
}

export function getMenuItemPublicId(restaurantUsername: string, itemId: string): string {
  return `restaurants/${restaurantUsername}/menu-items/${itemId}`;
}

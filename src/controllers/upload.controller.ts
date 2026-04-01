import { Request, Response } from 'express';
import cloudinary from '../config/cloudinary';
import { sendSuccess, sendError } from '../utils/response';

/**
 * Upload single pet photo to Cloudinary
 * POST /api/pets/upload
 */
export const uploadPetPhoto = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File;
    
    if (!file) {
      return sendError(res, 'No file uploaded', 'NO_FILE', 400);
    }

    // Convert buffer to base64
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'snifr/pets',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 1920, height: 1920, crop: 'limit' }, // Resize large images
        { quality: 'auto:good' } // Optimize quality
      ]
    });

    return sendSuccess(res, 'Photo uploaded successfully', {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format
    }, 201);
  } catch (error: any) {
    console.error('Upload error:', error.message);
    return sendError(res, 'Failed to upload image', error.message, 500);
  }
};

/**
 * Delete photo from Cloudinary
 * DELETE /api/pets/upload/:publicId
 */
export const deletePetPhoto = async (req: Request, res: Response) => {
  const { publicId } = req.params;

  try {
    if (!publicId) {
      return sendError(res, 'Public ID is required', 'NO_PUBLIC_ID', 400);
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      return sendSuccess(res, 'Photo deleted successfully', null, 200);
    } else {
      return sendError(res, 'Failed to delete photo', 'DELETE_FAILED', 400);
    }
  } catch (error: any) {
    console.error('Delete error:', error.message);
    return sendError(res, 'Failed to delete image', error.message, 500);
  }
};

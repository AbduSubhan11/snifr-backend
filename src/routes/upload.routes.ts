import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import upload from '../middleware/upload.middleware';
import {
  uploadPetPhoto,
  deletePetPhoto,
} from '../controllers/upload.controller';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * Upload single pet photo
 * POST /api/pets/upload
 * Content-Type: multipart/form-data
 * Field name: "photo"
 * Note: Each pet can have ONLY 1 photo
 */
router.post(
  '/',
  upload.single('photo'),
  (req, res) => uploadPetPhoto(req, res)
);

/**
 * Delete pet photo by public ID
 * DELETE /api/pets/upload/:publicId
 */
router.delete(
  '/:publicId',
  (req, res) => deletePetPhoto(req, res)
);

export default router;

import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import upload from '../middleware/upload.middleware';
import {
  uploadPetPhoto,
  deletePetPhoto,
  uploadVaccinationDocument,
} from '../controllers/upload.controller';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * Upload single pet photo
 * POST /api/pets/upload
 * Content-Type: multipart/form-data
 * Field name: "photo"
 */
router.post(
  '/upload',
  upload.single('photo'),
  (req, res) => uploadPetPhoto(req, res)
);

/**
 * Upload vaccination document
 * POST /api/pets/upload-vaccination
 * Content-Type: multipart/form-data
 * Field name: "document"
 */
router.post(
  '/upload-vaccination',
  upload.single('document'),
  (req, res) => uploadVaccinationDocument(req, res)
);

/**
 * Delete pet photo by public ID
 * DELETE /api/pets/upload/:publicId
 */
router.delete(
  '/upload/:publicId',
  (req, res) => deletePetPhoto(req, res)
);

export default router;

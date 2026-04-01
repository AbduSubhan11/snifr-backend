import express from 'express';
import {
  submitVerificationRequest,
  getPetVerificationRequests,
  getAllPendingVerificationRequests,
  getVerificationRequest,
  approveVerificationRequest,
  rejectVerificationRequest,
  deleteVerification,
} from '../controllers/verification.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';
import upload from '../middleware/upload.middleware';

const router = express.Router();

/**
 * User Routes
 */
// Submit a verification request (upload document)
router.post('/submit', protect, upload.single('document'), submitVerificationRequest);

// Get verification requests for a pet
router.get('/pet/:petId', protect, getPetVerificationRequests);

/**
 * Admin Routes
 */
// Get all pending verification requests
router.get('/pending', protect, adminOnly, getAllPendingVerificationRequests);

// Get a specific verification request
router.get('/:id', protect, adminOnly, getVerificationRequest);

// Approve a verification request
router.patch('/:id/approve', protect, adminOnly, approveVerificationRequest);

// Reject a verification request
router.patch('/:id/reject', protect, adminOnly, rejectVerificationRequest);

// Delete a verification request
router.delete('/:id', protect, adminOnly, deleteVerification);

export default router;

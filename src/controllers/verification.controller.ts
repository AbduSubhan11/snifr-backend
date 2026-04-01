import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createVerificationRequest,
  getVerificationRequestsByPetId,
  getPendingVerificationRequests,
  getVerificationRequestById,
  updateVerificationRequest,
  deleteVerificationRequest,
} from '../repositories/verificationRepository';
import { getPetByIdAndUserId, getPetById, updatePet } from '../repositories/petRepository';
import { hardDeletePet } from '../repositories/petRepository';
import { sendSuccess, sendError } from '../utils/response';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Submit a verification request (User)
 * POST /api/verification/submit
 * Expects document to be uploaded first via /pets/upload-vaccination
 */
export const submitVerificationRequest = async (req: AuthRequest, res: Response) => {
  const { petId, documentUrl, documentPublicId, documentType, notes } = req.body;

  console.log('📥 Submit verification request received:');
  console.log('   petId:', petId);
  console.log('   documentUrl:', documentUrl);
  console.log('   documentPublicId:', documentPublicId);
  console.log('   documentType:', documentType);
  console.log('   user:', req.user?.id);

  try {
    // Validate required fields
    if (!petId) {
      console.error('❌ Missing petId');
      return sendError(res, 'Pet ID is required', 'MISSING_PET_ID', 400);
    }

    if (!documentUrl || !documentPublicId) {
      console.error('❌ Missing document URL or Public ID');
      return sendError(res, 'Document URL and Public ID are required', 'MISSING_DOCUMENT', 400);
    }

    if (!documentType || !['vaccination_certificate', 'vet_certificate', 'medical_record'].includes(documentType)) {
      console.error('❌ Invalid document type:', documentType);
      return sendError(res, 'Valid document type is required', 'INVALID_DOCUMENT_TYPE', 400);
    }

    // Verify pet ownership
    console.log('🔍 Verifying pet ownership...');
    const pet = await getPetByIdAndUserId(petId, req.user.id);
    if (!pet) {
      console.error('❌ Pet not found or user not owner');
      return sendError(res, 'Pet not found or you do not own this pet', 'PET_NOT_FOUND', 404);
    }
    console.log('✅ Pet verified:', pet.name);

    // Create verification request
    console.log('📝 Creating verification request...');
    const verificationRequest = await createVerificationRequest({
      pet_id: petId,
      user_id: req.user.id,
      document_url: documentUrl,
      document_public_id: documentPublicId,
      document_type: documentType,
      notes: notes || undefined,
    });
    console.log('✅ Verification request created:', verificationRequest.id);

    // ALSO update pet's vaccination document URL (like pet photo)
    console.log('💾 Updating pet vaccination document...');
    await updatePet(petId, req.user.id, { 
      vaccination_document_url: documentUrl,
      vaccination_document_public_id: documentPublicId,
    });
    console.log('✅ Pet updated with vaccination document');

    return sendSuccess(
      res,
      'Verification request submitted successfully. Pending admin approval.',
      {
        id: verificationRequest.id,
        petId: verificationRequest.pet_id,
        status: verificationRequest.status,
        documentUrl: verificationRequest.document_url,
        createdAt: verificationRequest.created_at,
      },
      201
    );
  } catch (error: any) {
    console.error('❌ Submit verification request error:', error.message);
    console.error('❌ Error stack:', error.stack);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get verification requests for a pet (User)
 * GET /api/verification/pet/:petId
 */
export const getPetVerificationRequests = async (req: AuthRequest, res: Response) => {
  const { petId } = req.params;

  try {
    // Verify pet ownership
    const pet = await getPetByIdAndUserId(petId, req.user.id);
    if (!pet) {
      return sendError(res, 'Pet not found or you do not own this pet', 'PET_NOT_FOUND', 404);
    }

    const requests = await getVerificationRequestsByPetId(petId);

    return sendSuccess(res, 'Verification requests retrieved successfully', {
      petId,
      petName: pet.name,
      requests: requests.map((r: any) => ({
        id: r.id,
        status: r.status,
        documentType: r.document_type,
        documentUrl: r.document_url,
        notes: r.notes,
        rejectionReason: r.rejection_reason,
        reviewerName: r.reviewer_name,
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at,
      })),
    });
  } catch (error: any) {
    console.error('Get pet verification requests error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get all pending verification requests (Admin only)
 * GET /api/verification/pending
 */
export const getAllPendingVerificationRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await getPendingVerificationRequests(50);

    return sendSuccess(res, 'Pending verification requests retrieved successfully', {
      count: requests.length,
      requests: requests.map((r: any) => ({
        id: r.id,
        petId: r.pet_id,
        petName: r.pet_name,
        petBreed: r.pet_breed,
        petSpecies: r.pet_species,
        ownerId: r.user_id,
        ownerName: r.owner_name,
        ownerEmail: r.owner_email,
        ownerPhone: r.owner_phone,
        documentType: r.document_type,
        documentUrl: r.document_url,
        notes: r.notes,
        createdAt: r.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Get pending verification requests error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get a specific verification request (Admin only)
 * GET /api/verification/:id
 */
export const getVerificationRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const request = await getVerificationRequestById(id);

    if (!request) {
      return sendError(res, 'Verification request not found', 'REQUEST_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Verification request retrieved successfully', {
      id: request.id,
      petId: request.pet_id,
      petName: request.pet_name,
      petBreed: request.pet_breed,
      ownerId: request.user_id,
      ownerName: request.owner_name,
      documentType: request.document_type,
      documentUrl: request.document_url,
      notes: request.notes,
      status: request.status,
      rejectionReason: request.rejection_reason,
      reviewerName: request.reviewer_name,
      createdAt: request.created_at,
      reviewedAt: request.reviewed_at,
    });
  } catch (error: any) {
    console.error('Get verification request error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Approve a verification request (Admin only)
 * PATCH /api/verification/:id/approve
 */
export const approveVerificationRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Get the verification request
    const request = await getVerificationRequestById(id);
    if (!request) {
      return sendError(res, 'Verification request not found', 'REQUEST_NOT_FOUND', 404);
    }

    if (request.status !== 'pending') {
      return sendError(res, 'This request has already been processed', 'ALREADY_PROCESSED', 400);
    }

    // Update verification request status
    const updatedRequest = await updateVerificationRequest(id, {
      status: 'approved',
      reviewed_by: req.user.id,
    });

    // Update pet's verified status
    await updatePet(request.pet_id, request.user_id, { 
      is_verified: true,
      vaccination_status: true,
    });

    return sendSuccess(res, 'Verification request approved successfully. Pet is now verified! ✅', {
      id: updatedRequest.id,
      status: updatedRequest.status,
      petId: updatedRequest.pet_id,
      reviewedAt: updatedRequest.reviewed_at,
    });
  } catch (error: any) {
    console.error('Approve verification request error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Reject a verification request (Admin only)
 * PATCH /api/verification/:id/reject
 */
export const rejectVerificationRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    // Validate rejection reason
    if (!reason || reason.trim().length === 0) {
      return sendError(res, 'Rejection reason is required', 'MISSING_REASON', 400);
    }

    // Get the verification request
    const request = await getVerificationRequestById(id);
    if (!request) {
      return sendError(res, 'Verification request not found', 'REQUEST_NOT_FOUND', 404);
    }

    if (request.status !== 'pending') {
      return sendError(res, 'This request has already been processed', 'ALREADY_PROCESSED', 400);
    }

    // Update verification request status
    const updatedRequest = await updateVerificationRequest(id, {
      status: 'rejected',
      reviewed_by: req.user.id,
      rejection_reason: reason.trim(),
    });

    // Keep pet as unverified (should already be false)
    await updatePet(request.pet_id, request.user_id, { is_verified: false });

    return sendSuccess(res, 'Verification request rejected. Pet remains unverified.', {
      id: updatedRequest.id,
      status: updatedRequest.status,
      petId: updatedRequest.pet_id,
      rejectionReason: updatedRequest.rejection_reason,
      reviewedAt: updatedRequest.reviewed_at,
    });
  } catch (error: any) {
    console.error('Reject verification request error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Delete a verification request and associated document (Admin only)
 * DELETE /api/verification/:id
 */
export const deleteVerification = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const request = await getVerificationRequestById(id);
    if (!request) {
      return sendError(res, 'Verification request not found', 'REQUEST_NOT_FOUND', 404);
    }

    // Delete from Cloudinary
    if (request.document_public_id) {
      await cloudinary.uploader.destroy(request.document_public_id);
    }

    // Delete from database
    await deleteVerificationRequest(id);

    return sendSuccess(res, 'Verification request deleted successfully');
  } catch (error: any) {
    console.error('Delete verification request error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

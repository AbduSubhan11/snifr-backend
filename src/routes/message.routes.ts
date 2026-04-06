import { Router } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import { getMessagesByMatchId, getMatchParticipants } from '../repositories/messageRepository';
import { sendSuccess, sendError } from '../utils/response';
import upload from '../middleware/upload.middleware';
import { uploadToCloudinary } from '../config/cloudinary';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * GET /api/messages/:matchId
 * Get all messages for a match
 */
router.get('/:matchId', async (req: AuthRequest, res) => {
  try {
    const { matchId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user is part of this match
    const participants = await getMatchParticipants(matchId);
    
    if (!participants) {
      return sendError(res, 'Match not found', 'MATCH_NOT_FOUND', 404);
    }

    const isParticipant = 
      participants.user_1_id === req.user!.id || 
      participants.user_2_id === req.user!.id;

    if (!isParticipant) {
      return sendError(res, 'You are not part of this match', 'UNAUTHORIZED', 403);
    }

    const messages = await getMessagesByMatchId(matchId, parseInt(limit as string), parseInt(offset as string));

    // Format response with participant info
    const otherUser = participants.user_1_id === req.user!.id
      ? {
          id: participants.user_2_id,
          name: participants.user_2_name,
          avatar: participants.user_2_avatar,
          petId: participants.pet_2_id,
          petName: participants.pet_2_name,
          petPhoto: participants.pet_2_photo,
        }
      : {
          id: participants.user_1_id,
          name: participants.user_1_name,
          avatar: participants.user_1_avatar,
          petId: participants.pet_1_id,
          petName: participants.pet_1_name,
          petPhoto: participants.pet_1_photo,
        };

    sendSuccess(res, 'Messages loaded successfully', {
      messages: messages.reverse(), // Return in chronological order
      otherUser,
      hasMore: messages.length === parseInt(limit as string),
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to load messages', 'LOAD_MESSAGES_FAILED', 500);
  }
});

/**
 * POST /api/messages/:matchId/upload
 * Upload image for chat message
 */
router.post('/:matchId/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No image file provided', 'NO_FILE', 400);
    }

    const result = await uploadToCloudinary(req.file.buffer, 'snifr/chat');

    sendSuccess(res, 'Image uploaded successfully', {
      imageUrl: result.secure_url,
      imagePublicId: result.public_id,
    });
  } catch (error: any) {
    sendError(res, error.message || 'Failed to upload image', 'UPLOAD_FAILED', 500);
  }
});

export default router;

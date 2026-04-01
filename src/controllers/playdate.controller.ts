import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import pool from '../config/db';
import {
  createPlaydate,
  getPlaydatesByPetId,
  getPlaydatesByPetIds,
  getPlaydateById,
  updatePlaydateStatus,
  getPlaydatesByMatchId,
  PlaydateData,
} from '../repositories/playdateRepository';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Format playdate data for response
 */
const formatPlaydate = (playdate: any) => ({
  id: playdate.id,
  matchId: playdate.match_id,
  petId: playdate.pet_id,
  invitedPetId: playdate.invited_pet_id,
  title: playdate.title,
  locationName: playdate.location_name,
  locationAddress: playdate.location_address,
  latitude: playdate.latitude,
  longitude: playdate.longitude,
  scheduledDate: playdate.scheduled_date,
  scheduledTime: playdate.scheduled_time,
  durationMinutes: playdate.duration_minutes,
  status: playdate.status,
  message: playdate.message,
  declinedReason: playdate.declined_reason,
  invitedAt: playdate.invited_at,
  respondedAt: playdate.responded_at,
  completedAt: playdate.completed_at,
  cancelledAt: playdate.cancelled_at,
  createdAt: playdate.created_at,
  updatedAt: playdate.updated_at,
});

/**
 * Create a playdate request
 * POST /api/playdates
 */
export const createPlaydateRequest = async (req: AuthRequest, res: Response) => {
  const {
    matchId,
    invitedPetId,
    title,
    locationName,
    locationAddress,
    latitude,
    longitude,
    scheduledDate,
    scheduledTime,
    durationMinutes,
    message,
  } = req.body;

  // Validation
  if (!matchId || !invitedPetId || !title || !locationName || !scheduledDate || !scheduledTime) {
    return sendError(
      res,
      'Match ID, invited pet ID, title, location, date, and time are required',
      'VALIDATION_ERROR',
      400
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(scheduledDate)) {
    return sendError(res, 'Invalid date format. Use YYYY-MM-DD', 'VALIDATION_ERROR', 400);
  }

  // Validate time format
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(scheduledTime)) {
    return sendError(res, 'Invalid time format. Use HH:MM', 'VALIDATION_ERROR', 400);
  }

  // Check if date is in the future
  const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
  if (scheduledDateTime < new Date()) {
    return sendError(res, 'Playdate must be scheduled in the future', 'VALIDATION_ERROR', 400);
  }

  try {
    // Get user's pet ID
    const userPetQuery = `
      SELECT id FROM pets
      WHERE user_id = $1 AND is_active = TRUE
      LIMIT 1
    `;
    const userPetResult = await pool.query(userPetQuery, [req.user.id]);

    if (userPetResult.rows.length === 0) {
      return sendError(res, 'You need to create a pet profile first', 'PET_NOT_FOUND', 400);
    }

    const petId = userPetResult.rows[0].id;

    const playdateData: PlaydateData = {
      match_id: matchId,
      pet_id: petId,
      invited_pet_id: invitedPetId,
      title,
      location_name: locationName,
      location_address: locationAddress || null,
      latitude: latitude || null,
      longitude: longitude || null,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      duration_minutes: durationMinutes || 60,
      message: message || null,
    };

    const playdate = await createPlaydate(playdateData);

    return sendSuccess(res, 'Playdate request sent successfully', formatPlaydate(playdate), 201);
  } catch (error: any) {
    console.error('Create playdate error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get all playdates for the logged-in user
 * GET /api/playdates
 */
export const getUserPlaydates = async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit } = req.query;

    // Get ALL user's pet IDs
    const userPetsQuery = `
      SELECT id FROM pets
      WHERE user_id = $1 AND is_active = TRUE
    `;
    const userPetsResult = await pool.query(userPetsQuery, [req.user.id]);

    if (userPetsResult.rows.length === 0) {
      return sendError(res, 'You need to create a pet profile first', 'PET_NOT_FOUND', 400);
    }

    const petIds = userPetsResult.rows.map(r => r.id);
    
    // Get playdates for all user's pets
    const playdates = await getPlaydatesByPetIds(petIds, status as string, parseInt(limit as string) || 50);

    // Format playdates and add isSender flag
    const formattedPlaydates = playdates.map(p => {
      const isSender = petIds.includes(p.pet_id);
      return {
        ...formatPlaydate(p),
        isSender,
        // Always include both pet details for display
        senderPetName: p.sender_pet_name,
        senderPetBreed: p.sender_pet_breed,
        senderPetPhoto: p.sender_pet_photo,
        senderOwnerName: p.sender_owner_name,
        invitedPetName: p.invited_pet_name,
        invitedPetBreed: p.invited_pet_breed,
        invitedPetPhoto: p.invited_pet_photo,
        invitedOwnerName: p.invited_owner_name,
      };
    });

    return sendSuccess(
      res,
      'Playdates retrieved successfully',
      {
        playdates: formattedPlaydates,
        count: formattedPlaydates.length,
      },
      200
    );
  } catch (error: any) {
    console.error('Get playdates error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get a specific playdate by ID
 * GET /api/playdates/:id
 */
export const getPlaydateByIdController = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const playdate = await getPlaydateById(id, req.user.id);

    if (!playdate) {
      return sendError(res, 'Playdate not found or not authorized', 'PLAYDATE_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Playdate retrieved successfully', formatPlaydate(playdate), 200);
  } catch (error: any) {
    console.error('Get playdate by ID error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Accept a playdate request
 * PATCH /api/playdates/:id/accept
 */
export const acceptPlaydate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const playdate = await updatePlaydateStatus(id, req.user.id, 'accepted');

    if (!playdate) {
      return sendError(res, 'Playdate not found or not authorized', 'PLAYDATE_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Playdate accepted successfully', formatPlaydate(playdate), 200);
  } catch (error: any) {
    console.error('Accept playdate error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Decline a playdate request
 * PATCH /api/playdates/:id/decline
 */
export const declinePlaydate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const playdate = await updatePlaydateStatus(id, req.user.id, 'declined', reason);

    if (!playdate) {
      return sendError(res, 'Playdate not found or not authorized', 'PLAYDATE_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Playdate declined', formatPlaydate(playdate), 200);
  } catch (error: any) {
    console.error('Decline playdate error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Cancel a playdate
 * PATCH /api/playdates/:id/cancel
 */
export const cancelPlaydate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const playdate = await updatePlaydateStatus(id, req.user.id, 'cancelled', reason);

    if (!playdate) {
      return sendError(res, 'Playdate not found or not authorized', 'PLAYDATE_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Playdate cancelled', formatPlaydate(playdate), 200);
  } catch (error: any) {
    console.error('Cancel playdate error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Mark a playdate as completed
 * PATCH /api/playdates/:id/complete
 */
export const completePlaydate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const playdate = await updatePlaydateStatus(id, req.user.id, 'completed');

    if (!playdate) {
      return sendError(res, 'Playdate not found or not authorized', 'PLAYDATE_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Playdate marked as completed', formatPlaydate(playdate), 200);
  } catch (error: any) {
    console.error('Complete playdate error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get playdates by match ID
 * GET /api/matches/:matchId/playdates
 */
export const getPlaydatesByMatch = async (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;

  try {
    const playdates = await getPlaydatesByMatchId(matchId, req.user.id);

    return sendSuccess(
      res,
      'Playdates retrieved successfully',
      {
        playdates: playdates.map(formatPlaydate),
        count: playdates.length,
      },
      200
    );
  } catch (error: any) {
    console.error('Get playdates by match error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

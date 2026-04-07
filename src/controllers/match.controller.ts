import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import pool from '../config/db';
import {
  getAvailablePets,
  createSwipe,
  checkForMatch,
  getMatchesByUserId,
  getMatchById,
  getMatchStats,
  unmatch,
} from '../repositories/matchRepository';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Format match data for response
 */
const formatMatch = (match: any) => ({
  id: match.match_id,
  matchedPetId: match.matched_pet_id,
  matchedPetName: match.matched_pet_name,
  matchedPetBreed: match.matched_pet_breed,
  matchedPetAge: match.matched_pet_age,
  matchedPetSpecies: match.matched_pet_species,
  matchedPetPhoto: match.matched_pet_photo,
  matchedPetEnergyLevel: match.matched_pet_energy_level,
  ownerName: match.owner_name,
  ownerAvatar: match.owner_avatar,
  matchedAt: match.matched_at,
  createdAt: match.created_at,
});

/**
 * Format owner-centric match data
 */
const formatOwnerMatch = (ownerMatch: any) => ({
  ownerId: ownerMatch.ownerId,
  ownerName: ownerMatch.ownerName,
  ownerAvatar: ownerMatch.ownerAvatar,
  matchedAt: ownerMatch.matchedAt,
  pets: ownerMatch.pets.map((pet: any) => ({
    matchId: pet.matchId,
    petId: pet.petId,
    petName: pet.petName,
    petBreed: pet.petBreed,
    petAge: pet.petAge,
    petGender: pet.petGender,
    petSpecies: pet.petSpecies,
    petPhoto: pet.petPhoto,
    petEnergyLevel: pet.petEnergyLevel,
    myPetName: pet.myPetName,
    myPetPhoto: pet.myPetPhoto,
  })),
});

/**
 * Format pet data for response
 */
const formatDiscoverPet = (pet: any) => ({
  id: pet.id,
  name: pet.name,
  breed: pet.breed,
  age: pet.age,
  gender: pet.gender,
  species: pet.species,
  temperament: pet.temperament,
  energyLevel: pet.energy_level,
  weight: pet.weight,
  color: pet.color,
  bio: pet.bio,
  photoUrl: pet.photo_url,
  isVerified: pet.is_verified,
  ownerId: pet.user_id,
  ownerName: pet.owner_name,
  ownerAvatar: pet.owner_avatar,
});

/**
 * Get pets available for swiping
 * GET /api/matches/discover
 */
export const getDiscoverPets = async (req: AuthRequest, res: Response) => {
  try {
    const { species, limit } = req.query;
    const pets = await getAvailablePets(
      req.user.id,
      parseInt(limit as string) || 20,
      species as string
    );

    return sendSuccess(
      res,
      'Pets retrieved successfully',
      {
        pets: pets.map(formatDiscoverPet),
        count: pets.length,
      },
      200
    );
  } catch (error: any) {
    console.error('Get discover pets error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Swipe on a pet (like or dislike)
 * POST /api/matches/swipe
 */
export const swipePet = async (req: AuthRequest, res: Response) => {
  const { targetPetId, userPetId, liked } = req.body;

  // Validation
  if (!targetPetId) {
    return sendError(res, 'Target pet ID is required', 'VALIDATION_ERROR', 400);
  }

  if (!userPetId) {
    return sendError(res, 'Your pet ID is required', 'VALIDATION_ERROR', 400);
  }

  if (liked === undefined) {
    return sendError(res, 'Like status is required', 'VALIDATION_ERROR', 400);
  }

  if (typeof liked !== 'boolean') {
    return sendError(res, 'Liked must be a boolean', 'VALIDATION_ERROR', 400);
  }

  try {
    // Verify user owns the pet they're selecting
    const verifyPetQuery = `
      SELECT id FROM pets
      WHERE id = $1 AND user_id = $2 AND is_active = TRUE
    `;
    const petResult = await pool.query(verifyPetQuery, [userPetId, req.user.id]);

    if (petResult.rows.length === 0) {
      return sendError(res, 'Invalid pet selection', 'PET_NOT_FOUND', 400);
    }

    // Prevent swiping on own pet
    if (userPetId === targetPetId) {
      return sendError(res, 'Cannot swipe on your own pet', 'VALIDATION_ERROR', 400);
    }

    // Check if target pet exists and get owner info
    const targetPetQuery = `
      SELECT p.id, p.user_id, u.id as owner_user_id
      FROM pets p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1 AND p.is_active = TRUE
    `;
    const targetResult = await pool.query(targetPetQuery, [targetPetId]);
    
    if (targetResult.rows.length === 0) {
      return sendError(res, 'Target pet not found', 'PET_NOT_FOUND', 404);
    }

    // Create swipe with user's selected pet
    const swipe = await createSwipe(userPetId, targetPetId, liked);

    // Check if swipe already existed
    const swipeExisted = swipe.liked_at && new Date(swipe.liked_at) < new Date();

    if (swipeExisted) {
      return sendSuccess(res, 'You have already swiped on this pet', {
        isMatch: false,
        alreadySwiped: true
      }, 200);
    }

    // Check if it's a match (both liked)
    let matchResult = null;
    if (liked) {
      matchResult = await checkForMatch(userPetId, targetPetId);
    }

    const response: any = {
      swipe: {
        id: swipe.id,
        status: swipe.status,
        liked: swipe.pet_1_liked || swipe.pet_2_liked,
        createdAt: swipe.created_at,
      },
    };

    if (matchResult?.is_match) {
      response.isMatch = true;
      response.match = formatMatch(matchResult.match);
      response.message = "It's a match! Both pets liked each other!";
    } else {
      response.isMatch = false;
      response.message = liked ? 'Swipe request sent! Waiting for response.' : 'Pet skipped';
    }

    return sendSuccess(res, response.message, response, 200);
  } catch (error: any) {
    console.error('Swipe pet error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get all matches for the logged-in user grouped by owner
 * GET /api/matches
 */
export const getUserMatches = async (req: AuthRequest, res: Response) => {
  try {
    const { limit } = req.query;
    const ownerMatches = await getMatchesByUserId(req.user.id, parseInt(limit as string) || 50);

    return sendSuccess(
      res,
      'Matches retrieved successfully',
      {
        matches: ownerMatches.map(formatOwnerMatch),
        count: ownerMatches.length,
      },
      200
    );
  } catch (error: any) {
    console.error('Get matches error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get a specific match by ID
 * GET /api/matches/:id
 */
export const getMatchByIdController = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const match = await getMatchById(id, req.user.id);

    if (!match) {
      return sendError(res, 'Match not found', 'MATCH_NOT_FOUND', 404);
    }

    const formattedMatch = {
      id: match.id,
      status: match.status,
      matchedAt: match.matched_at,
      createdAt: match.created_at,
      pet1: {
        id: match.pet_1_id,
        name: match.pet_1_name,
        breed: match.pet_1_breed,
        age: match.pet_1_age,
        species: match.pet_1_species,
        photo: match.pet_1_photo,
        energyLevel: match.pet_1_energy_level,
        temperament: match.pet_1_temperament,
        ownerName: match.owner_1_name,
        ownerAvatar: match.owner_1_avatar,
      },
      pet2: {
        id: match.pet_2_id,
        name: match.pet_2_name,
        breed: match.pet_2_breed,
        age: match.pet_2_age,
        species: match.pet_2_species,
        photo: match.pet_2_photo,
        energyLevel: match.pet_2_energy_level,
        temperament: match.pet_2_temperament,
        ownerName: match.owner_2_name,
        ownerAvatar: match.owner_2_avatar,
      },
    };

    return sendSuccess(res, 'Match retrieved successfully', formattedMatch, 200);
  } catch (error: any) {
    console.error('Get match by ID error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get match statistics
 * GET /api/matches/stats
 */
export const getMatchStatsController = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getMatchStats(req.user.id);

    return sendSuccess(
      res,
      'Stats retrieved successfully',
      {
        totalMatches: stats.total_matches,
        pendingSwipes: stats.pending_swipes,
        totalLikes: stats.total_likes,
      },
      200
    );
  } catch (error: any) {
    console.error('Get match stats error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Unmatch a connection
 * DELETE /api/matches/:id
 */
export const unmatchController = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await unmatch(id, req.user.id);

    if (!result) {
      return sendError(res, 'Match not found', 'MATCH_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Match removed successfully', null, 200);
  } catch (error: any) {
    console.error('Unmatch error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get pending match requests (incoming swipe requests)
 * GET /api/matches/pending
 */
export const getPendingRequests = async (req: AuthRequest, res: Response) => {
  try {
    const query = `
      SELECT
        m.id as match_id,
        m.status,
        m.created_at,
        m.pet_1_id,
        m.pet_2_id,
        m.pet_1_liked,
        m.pet_2_liked,
        -- Pet 1 info (the one who swiped first / initiated)
        p1.id as pet_1_pet_id,
        p1.name as pet_1_pet_name,
        p1.breed as pet_1_pet_breed,
        p1.age as pet_1_pet_age,
        p1.gender as pet_1_pet_gender,
        p1.species as pet_1_pet_species,
        p1.photo_url as pet_1_pet_photo,
        u1.id as pet_1_user_id,
        u1.full_name as pet_1_user_name,
        u1.avatar_url as pet_1_user_avatar,
        -- Pet 2 info (the one receiving the request)
        p2.id as pet_2_pet_id,
        p2.name as pet_2_pet_name,
        p2.breed as pet_2_pet_breed,
        p2.age as pet_2_pet_age,
        p2.gender as pet_2_pet_gender,
        p2.species as pet_2_pet_species,
        p2.photo_url as pet_2_pet_photo
      FROM matches m
      JOIN pets p1 ON m.pet_1_id = p1.id
      JOIN pets p2 ON m.pet_2_id = p2.id
      JOIN users u1 ON p1.user_id = u1.id
      JOIN users u2 ON p2.user_id = u2.id
      WHERE m.status = 'pending'
        AND m.pet_1_liked = TRUE
        AND m.pet_2_liked = FALSE
        AND p2.user_id = $1
      ORDER BY m.created_at DESC
    `;

    const result = await pool.query(query, [req.user.id]);

    const pendingRequests = result.rows.map(row => ({
      matchId: row.match_id,
      status: row.status,
      createdAt: row.created_at,
      senderPet: {
        id: row.pet_1_pet_id,
        name: row.pet_1_pet_name,
        breed: row.pet_1_pet_breed,
        age: row.pet_1_pet_age,
        gender: row.pet_1_pet_gender,
        species: row.pet_1_pet_species,
        photo: row.pet_1_pet_photo,
      },
      myPet: {
        id: row.pet_2_pet_id,
        name: row.pet_2_pet_name,
        gender: row.pet_2_pet_gender,
        species: row.pet_2_pet_species,
        photo: row.pet_2_pet_photo,
      },
      sender: {
        userId: row.pet_1_user_id,
        name: row.pet_1_user_name,
        avatar: row.pet_1_user_avatar,
      },
    }));

    return sendSuccess(
      res,
      'Pending requests retrieved successfully',
      {
        requests: pendingRequests,
        count: pendingRequests.length,
      },
      200
    );
  } catch (error: any) {
    console.error('Get pending requests error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Accept a pending match request
 * PATCH /api/matches/:id/accept
 */
export const acceptMatchRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Verify match exists and user is the receiver (pet_2 owner)
    const verifyQuery = `
      SELECT m.*, p1.user_id as pet_1_owner_id, p2.user_id as pet_2_owner_id
      FROM matches m
      JOIN pets p1 ON m.pet_1_id = p1.id
      JOIN pets p2 ON m.pet_2_id = p2.id
      WHERE m.id = $1 AND m.status = 'pending'
        AND m.pet_1_liked = TRUE
        AND m.pet_2_liked = FALSE
    `;
    const verifyResult = await pool.query(verifyQuery, [id]);

    if (verifyResult.rows.length === 0) {
      return sendError(res, 'Match request not found', 'MATCH_NOT_FOUND', 404);
    }

    const match = verifyResult.rows[0];

    // Verify user is the receiver (pet_2 owner)
    if (match.pet_2_owner_id !== req.user.id) {
      return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }

    // Update: set pet_2_liked to TRUE and status to matched
    const updateQuery = `
      UPDATE matches
      SET 
        pet_2_liked = TRUE,
        status = 'matched',
        matched_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [id]);

    return sendSuccess(res, 'Match request accepted!', null, 200);
  } catch (error: any) {
    console.error('Accept match request error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Decline a pending match request
 * PATCH /api/matches/:id/decline
 */
export const declineMatchRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Verify match exists and user is the receiver (pet_2 owner)
    const verifyQuery = `
      SELECT m.*, p1.user_id as pet_1_owner_id, p2.user_id as pet_2_owner_id
      FROM matches m
      JOIN pets p1 ON m.pet_1_id = p1.id
      JOIN pets p2 ON m.pet_2_id = p2.id
      WHERE m.id = $1 AND m.status = 'pending'
        AND m.pet_1_liked = TRUE
        AND m.pet_2_liked = FALSE
    `;
    const verifyResult = await pool.query(verifyQuery, [id]);

    if (verifyResult.rows.length === 0) {
      return sendError(res, 'Match request not found', 'MATCH_NOT_FOUND', 404);
    }

    const match = verifyResult.rows[0];

    // Verify user is the receiver (pet_2 owner)
    if (match.pet_2_owner_id !== req.user.id) {
      return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 403);
    }

    // Update status to rejected
    const updateQuery = `
      UPDATE matches
      SET 
        status = 'rejected',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    await pool.query(updateQuery, [id]);

    return sendSuccess(res, 'Match request declined', null, 200);
  } catch (error: any) {
    console.error('Decline match request error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

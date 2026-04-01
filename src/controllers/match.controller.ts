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
  id: match.id,
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
  const { targetPetId, liked } = req.body;

  // Validation
  if (!targetPetId) {
    return sendError(res, 'Target pet ID is required', 'VALIDATION_ERROR', 400);
  }

  if (liked === undefined) {
    return sendError(res, 'Like status is required', 'VALIDATION_ERROR', 400);
  }

  if (typeof liked !== 'boolean') {
    return sendError(res, 'Liked must be a boolean', 'VALIDATION_ERROR', 400);
  }

  try {
    // Get user's pet ID (first pet for now, can be enhanced to select specific pet)
    const userPetQuery = `
      SELECT id FROM pets
      WHERE user_id = $1 AND is_active = TRUE
      LIMIT 1
    `;
    const userPetResult = await pool.query(userPetQuery, [req.user.id]);

    if (userPetResult.rows.length === 0) {
      return sendError(res, 'You need to create a pet profile first', 'PET_NOT_FOUND', 400);
    }

    const userPetId = userPetResult.rows[0].id;

    // Prevent swiping on own pet
    if (userPetId === targetPetId) {
      return sendError(res, 'Cannot swipe on your own pet', 'VALIDATION_ERROR', 400);
    }

    // Create swipe
    const swipe = await createSwipe(userPetId, targetPetId, liked);

    // Check if swipe already existed
    const swipeExisted = swipe.liked_at && new Date(swipe.liked_at) < new Date();
    
    if (swipeExisted) {
      // Already swiped on this pet
      return sendSuccess(res, 'You have already swiped on this pet', { 
        isMatch: false, 
        alreadySwiped: true 
      }, 200);
    }

    // Check if it's a match
    let matchResult = null;
    if (liked) {
      matchResult = await checkForMatch(userPetId, targetPetId);
    }

    const response: any = {
      swipe: {
        id: swipe.id,
        liked: swipe.pet_1_liked || swipe.pet_2_liked,
        createdAt: swipe.created_at,
      },
    };

    if (matchResult?.is_match) {
      response.isMatch = true;
      response.match = formatMatch(matchResult.match);
      response.message = "It's a match! You and this pet both liked each other.";
    } else {
      response.isMatch = false;
      response.message = liked ? 'Swipe recorded!' : 'Pet skipped';
    }

    return sendSuccess(res, response.message, response, 200);
  } catch (error: any) {
    console.error('Swipe pet error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get all matches for the logged-in user
 * GET /api/matches
 */
export const getUserMatches = async (req: AuthRequest, res: Response) => {
  try {
    const { limit } = req.query;
    const matches = await getMatchesByUserId(req.user.id, parseInt(limit as string) || 50);

    return sendSuccess(
      res,
      'Matches retrieved successfully',
      {
        matches: matches.map(formatMatch),
        count: matches.length,
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

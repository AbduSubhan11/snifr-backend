import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import {
  createPet,
  getPetsByUserId,
  getPetByIdAndUserId,
  updatePet,
  deletePet,
  PetData,
  PetUpdateData,
} from '../repositories/petRepository';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Format pet data for response
 */
const formatPet = (pet: any) => ({
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
  photoUrl: pet.photo_url || null,
  photoPublicId: pet.photo_public_id || null,
  isVerified: pet.is_verified,
  vaccinationStatus: pet.vaccination_status,
  vaccinationDocumentUrl: pet.vaccination_document_url || null,
  vaccinationDocumentPublicId: pet.vaccination_document_public_id || null,
  compatibilityScore: pet.compatibility_score,
  isActive: pet.is_active,
  createdAt: pet.created_at,
  updatedAt: pet.updated_at,
});

/**
 * Create a new pet profile
 * POST /api/pets
 */
export const createPetProfile = async (req: AuthRequest, res: Response) => {
  const {
    name,
    breed,
    age,
    gender,
    species,
    temperament,
    energyLevel,
    weight,
    color,
    bio,
    photoUrl,
    photoPublicId,
    vaccinationStatus,
    otherBreed,
  } = req.body;

  // Validation
  if (!name || !breed || !age || !gender) {
    return sendError(
      res,
      'Name, breed, age, and gender are required',
      'VALIDATION_ERROR',
      400
    );
  }

  if (age < 0 || age > 50) {
    return sendError(res, 'Age must be between 0 and 50', 'VALIDATION_ERROR', 400);
  }

  if (!['Male', 'Female'].includes(gender)) {
    return sendError(res, 'Gender must be Male or Female', 'VALIDATION_ERROR', 400);
  }

  if (species && !['Dog', 'Cat'].includes(species)) {
    return sendError(res, 'Species must be Dog or Cat', 'VALIDATION_ERROR', 400);
  }

  if (energyLevel && !['Low', 'Medium', 'High'].includes(energyLevel)) {
    return sendError(res, 'Energy level must be Low, Medium, or High', 'VALIDATION_ERROR', 400);
  }

  // Handle "Other" breed option
  let finalBreed = breed;
  if (breed === 'Other' && otherBreed) {
    finalBreed = otherBreed.trim();
  }

  try {
    const petData: PetData = {
      name,
      breed: finalBreed,
      age,
      gender,
      species: species || 'Dog',
      temperament,
      energy_level: energyLevel as 'Low' | 'Medium' | 'High',
      weight,
      color,
      bio,
      photo_url: photoUrl,
      photo_public_id: photoPublicId,
      vaccination_status: vaccinationStatus,
    };

    const pet = await createPet(req.user.id, petData);

    return sendSuccess(res, 'Pet profile created successfully', formatPet(pet), 201);
  } catch (error: any) {
    console.error('Create pet error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get all pets for the logged-in user
 * GET /api/pets
 */
export const getUserPets = async (req: AuthRequest, res: Response) => {
  try {
    const { includeInactive } = req.query;
    const isActive = includeInactive !== 'true';

    const pets = await getPetsByUserId(req.user.id, isActive);

    return sendSuccess(
      res,
      'Pets retrieved successfully',
      {
        pets: pets.map(formatPet),
        count: pets.length,
      },
      200
    );
  } catch (error: any) {
    console.error('Get pets error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get a specific pet by ID (ensures ownership)
 * GET /api/pets/:id
 */
export const getPetById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const pet = await getPetByIdAndUserId(id, req.user.id);

    if (!pet) {
      return sendError(res, 'Pet not found', 'PET_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Pet retrieved successfully', formatPet(pet), 200);
  } catch (error: any) {
    console.error('Get pet by ID error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Update a pet profile
 * PUT /api/pets/:id
 */
export const updatePetProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { otherBreed, breed } = req.body;

  const updateData: PetUpdateData = {};
  const allowedFields = [
    'name',
    'breed',
    'age',
    'gender',
    'species',
    'temperament',
    'energyLevel',
    'weight',
    'color',
    'bio',
    'photoUrl',
    'photoPublicId',
    'vaccinationStatus',
  ];

  for (const field of allowedFields) {
    if (req.body.hasOwnProperty(field)) {
      const dbField = field === 'energyLevel' ? 'energy_level' : field === 'vaccinationStatus' ? 'vaccination_status' : field === 'photoUrl' ? 'photo_url' : field === 'photoPublicId' ? 'photo_public_id' : field;
      updateData[dbField as keyof PetUpdateData] = req.body[field];
    }
  }

  // Handle "Other" breed option on update
  if (breed === 'Other' && otherBreed) {
    updateData.breed = otherBreed.trim();
  }

  // Validation
  if (updateData.age !== undefined && (updateData.age < 0 || updateData.age > 50)) {
    return sendError(res, 'Age must be between 0 and 50', 'VALIDATION_ERROR', 400);
  }

  if (updateData.gender && !['Male', 'Female'].includes(updateData.gender)) {
    return sendError(res, 'Gender must be Male or Female', 'VALIDATION_ERROR', 400);
  }

  if (updateData.species && !['Dog', 'Cat'].includes(updateData.species)) {
    return sendError(res, 'Species must be Dog or Cat', 'VALIDATION_ERROR', 400);
  }

  if (updateData.energy_level && !['Low', 'Medium', 'High'].includes(updateData.energy_level)) {
    return sendError(res, 'Energy level must be Low, Medium, or High', 'VALIDATION_ERROR', 400);
  }

  try {
    const pet = await updatePet(id, req.user.id, updateData);

    if (!pet) {
      return sendError(res, 'Pet not found or you are not authorized to update this pet', 'PET_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Pet profile updated successfully', formatPet(pet), 200);
  } catch (error: any) {
    if (error.message === 'No valid fields to update') {
      return sendError(res, 'No valid fields to update', 'VALIDATION_ERROR', 400);
    }
    console.error('Update pet error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Delete a pet profile (soft delete)
 * DELETE /api/pets/:id
 */
export const deletePetProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const pet = await deletePet(id, req.user.id);

    if (!pet) {
      return sendError(res, 'Pet not found or you are not authorized to delete this pet', 'PET_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Pet profile deleted successfully', null, 200);
  } catch (error: any) {
    console.error('Delete pet error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Verify a pet profile (upload vaccination proof)
 * PATCH /api/pets/:id/verify
 */
export const verifyPetProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { isVerified, vaccinationProof } = req.body;

  try {
    const updateData: PetUpdateData = {
      is_verified: isVerified !== undefined ? isVerified : true,
    };

    const pet = await updatePet(id, req.user.id, updateData);

    if (!pet) {
      return sendError(res, 'Pet not found or you are not authorized to update this pet', 'PET_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Pet profile verified successfully', formatPet(pet), 200);
  } catch (error: any) {
    console.error('Verify pet error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

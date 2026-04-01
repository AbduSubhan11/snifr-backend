import pool from '../config/db';

export interface PetData {
  name: string;
  breed: string;
  age: number;
  gender: 'Male' | 'Female';
  species?: 'Dog' | 'Cat';
  temperament?: string;
  energy_level?: 'Low' | 'Medium' | 'High';
  weight?: number;
  color?: string;
  bio?: string;
  photo_url?: string;
  photo_public_id?: string;
  vaccination_status?: boolean;
}

export interface PetUpdateData extends Partial<PetData> {
  is_verified?: boolean;
  compatibility_score?: number;
  is_active?: boolean;
}

/**
 * Create a new pet profile
 */
export const createPet = async (userId: string, petData: PetData) => {
  const {
    name,
    breed,
    age,
    gender,
    species = 'Dog',
    temperament,
    energy_level,
    weight,
    color,
    bio,
    photo_url,
    photo_public_id,
    vaccination_status = false,
  } = petData;

  const query = `
    INSERT INTO pets (
      user_id, name, breed, age, gender, species, temperament,
      energy_level, weight, color, bio, photo_url, photo_public_id, vaccination_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `;

  const values = [
    userId,
    name,
    breed,
    age,
    gender,
    species,
    temperament || null,
    energy_level || null,
    weight || null,
    color || null,
    bio || null,
    photo_url || null,
    photo_public_id || null,
    vaccination_status,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Get all pets for a specific user
 */
export const getPetsByUserId = async (userId: string, isActive: boolean = true) => {
  const query = `
    SELECT * FROM pets
    WHERE user_id = $1 AND is_active = $2
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [userId, isActive]);
  return result.rows;
};

/**
 * Get a single pet by ID and user ID (ensures ownership)
 */
export const getPetByIdAndUserId = async (petId: string, userId: string) => {
  const query = `
    SELECT * FROM pets
    WHERE id = $1 AND user_id = $2
  `;

  const result = await pool.query(query, [petId, userId]);
  return result.rows[0];
};

/**
 * Get a single pet by ID (without ownership check - for admin/internal use)
 */
export const getPetById = async (petId: string) => {
  const query = `
    SELECT * FROM pets
    WHERE id = $1
  `;

  const result = await pool.query(query, [petId]);
  return result.rows[0];
};

/**
 * Update a pet profile (ensures ownership)
 */
export const updatePet = async (petId: string, userId: string, updateData: PetUpdateData) => {
  const allowedFields = [
    'name', 'breed', 'age', 'gender', 'species', 'temperament',
    'energy_level', 'weight', 'color', 'bio',
    'photo_url', 'photo_public_id',
    'is_verified', 'vaccination_status', 'compatibility_score', 'is_active'
  ];

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (updateData.hasOwnProperty(field)) {
      updates.push(`${field} = $${paramIndex}`);
      values.push(updateData[field as keyof PetUpdateData]);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  updates.push(`updated_at = NOW()`);
  values.push(userId, petId);

  const query = `
    UPDATE pets
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex + 1} AND user_id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Delete a pet profile (soft delete - sets is_active to false)
 */
export const deletePet = async (petId: string, userId: string) => {
  const query = `
    UPDATE pets
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [petId, userId]);
  return result.rows[0];
};

/**
 * Permanently delete a pet (hard delete - for admin use)
 */
export const hardDeletePet = async (petId: string) => {
  const query = `
    DELETE FROM pets
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [petId]);
  return result.rows[0];
};

/**
 * Get pets by species and location (for discovery feature)
 */
export const getPetsBySpeciesAndLocation = async (species: string, limit: number = 20) => {
  const query = `
    SELECT p.*, u.full_name as owner_name, u.avatar_url as owner_avatar
    FROM pets p
    JOIN users u ON p.user_id = u.id
    WHERE p.species = $1 AND p.is_active = TRUE
    ORDER BY p.created_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [species, limit]);
  return result.rows;
};

/**
 * Count total pets for a user
 */
export const countPetsByUserId = async (userId: string, isActive: boolean = true) => {
  const query = `
    SELECT COUNT(*) as count
    FROM pets
    WHERE user_id = $1 AND is_active = $2
  `;

  const result = await pool.query(query, [userId, isActive]);
  return parseInt(result.rows[0].count);
};

import pool from '../config/db';

export interface SwipeData {
  pet_id: string;
  target_pet_id: string;
  liked: boolean;
}

export interface MatchStats {
  total_matches: number;
  pending_swipes: number;
  total_likes: number;
}

/**
 * Get pets available for swiping (not owned by user, not already swiped)
 */
export const getAvailablePets = async (userId: string, limit: number = 20, species?: string) => {
  // First get all user's pets
  const userPetsQuery = `SELECT id FROM pets WHERE user_id = $1 AND is_active = TRUE`;
  const userPets = await pool.query(userPetsQuery, [userId]);
  const userPetIds = userPets.rows.map(r => r.id);
  
  if (userPetIds.length === 0) {
    // User has no pets, return empty array
    console.log('User has no pets, returning empty array');
    return [];
  }

  let query = `
    SELECT 
      p.id,
      p.name,
      p.breed,
      p.age,
      p.gender,
      p.species,
      p.temperament,
      p.energy_level,
      p.weight,
      p.color,
      p.bio,
      p.photo_url,
      p.is_verified,
      u.full_name as owner_name,
      u.avatar_url as owner_avatar
    FROM pets p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id != $1
      AND p.is_active = TRUE
  `;

  const values: any[] = [userId];
  let paramIndex = 2;

  if (species && ['Dog', 'Cat'].includes(species)) {
    query += ` AND p.species = $${paramIndex}`;
    values.push(species);
    paramIndex++;
  }

  // Exclude pets already swiped by any of user's pets
  query += `
    AND p.id NOT IN (
      SELECT
        CASE
          WHEN pet_1_id = ANY($${paramIndex}) THEN pet_2_id
          ELSE pet_1_id
        END
      FROM matches
      WHERE pet_1_id = ANY($${paramIndex}) OR pet_2_id = ANY($${paramIndex})
    )
  `;
  values.push(userPetIds);

  query += ` ORDER BY RANDOM() LIMIT $${paramIndex + 1}`;
  values.push(limit);

  console.log('Executing query with userId:', userId, 'limit:', limit);
  const result = await pool.query(query, values);
  console.log('Found', result.rows.length, 'pets available for swiping');
  if (result.rows.length > 0) {
    console.log('First pet:', {
      id: result.rows[0].id,
      name: result.rows[0].name,
      photo_url: result.rows[0].photo_url,
      owner_name: result.rows[0].owner_name,
    });
  }
  return result.rows;
};

/**
 * Create a swipe (like or dislike)
 */
export const createSwipe = async (petId: string, targetPetId: string, liked: boolean) => {
  // Check if swipe already exists
  const existingQuery = `
    SELECT * FROM matches
    WHERE (pet_1_id = $1 AND pet_2_id = $2)
       OR (pet_1_id = $2 AND pet_2_id = $1)
  `;

  const existing = await pool.query(existingQuery, [petId, targetPetId]);

  if (existing.rows.length > 0) {
    // Swipe already exists - return existing record
    // Don't allow duplicate swipes
    return existing.rows[0];
  }

  // Create new swipe
  const insertQuery = `
    INSERT INTO matches (pet_1_id, pet_2_id, pet_1_liked, pet_2_liked, pet_1_disliked, pet_2_disliked, liked_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `;

  const values = liked
    ? [petId, targetPetId, true, false, false, false]
    : [petId, targetPetId, false, false, true, false];

  const result = await pool.query(insertQuery, values);
  return result.rows[0];
};

/**
 * Check if a swipe resulted in a match
 */
export const checkForMatch = async (petId: string, targetPetId: string) => {
  const query = `
    SELECT m.*, 
           p1.name as pet_1_name, p1.photo_url as pet_1_photo,
           p2.name as pet_2_name, p2.photo_url as pet_2_photo,
           u1.full_name as owner_1_name, u2.full_name as owner_2_name
    FROM matches m
    JOIN pets p1 ON m.pet_1_id = p1.id
    JOIN pets p2 ON m.pet_2_id = p2.id
    JOIN users u1 ON p1.user_id = u1.id
    JOIN users u2 ON p2.user_id = u2.id
    WHERE (m.pet_1_id = $1 AND m.pet_2_id = $2)
       OR (m.pet_1_id = $2 AND m.pet_2_id = $1)
      AND m.pet_1_liked = TRUE
      AND m.pet_2_liked = TRUE
      AND m.status != 'matched'
  `;

  const result = await pool.query(query, [petId, targetPetId]);
  
  if (result.rows.length > 0) {
    const match = result.rows[0];
    
    // Update match status
    const updateQuery = `
      UPDATE matches
      SET status = 'matched', matched_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    await pool.query(updateQuery, [match.id]);
    
    return {
      is_match: true,
      match: result.rows[0]
    };
  }

  return { is_match: false, match: null };
};

/**
 * Get all matches for a user
 */
export const getMatchesByUserId = async (userId: string, limit: number = 50) => {
  const query = `
    SELECT 
      m.id,
      m.matched_at,
      m.created_at,
      -- Get the other pet's info (not user's pet)
      CASE 
        WHEN m.pet_1_id IN (SELECT id FROM pets WHERE user_id = $1) THEN m.pet_2_id
        ELSE m.pet_1_id
      END as matched_pet_id,
      CASE 
        WHEN m.pet_1_id IN (SELECT id FROM pets WHERE user_id = $1) THEN p2.name
        ELSE p1.name
      END as matched_pet_name,
      CASE 
        WHEN m.pet_1_id IN (SELECT id FROM pets WHERE user_id = $1) THEN p2.breed
        ELSE p1.breed
      END as matched_pet_breed,
      CASE 
        WHEN m.pet_1_id IN (SELECT id FROM pets WHERE user_id = $1) THEN p2.age
        ELSE p1.age
      END as matched_pet_age,
      CASE 
        WHEN m.pet_1_id IN (SELECT id FROM pets WHERE user_id = $1) THEN p2.species
        ELSE p1.species
      END as matched_pet_species,
      CASE 
        WHEN m.pet_1_id IN (SELECT id FROM pets WHERE user_id = $1) THEN p2.photo_url
        ELSE p1.photo_url
      END as matched_pet_photo,
      CASE 
        WHEN m.pet_1_id IN (SELECT id FROM pets WHERE user_id = $1) THEN p2.energy_level
        ELSE p1.energy_level
      END as matched_pet_energy_level,
      CASE 
        WHEN m.pet_1_id IN (SELECT id FROM pets WHERE user_id = $1) THEN u2.full_name
        ELSE u1.full_name
      END as owner_name,
      CASE 
        WHEN m.pet_1_id IN (SELECT id FROM pets WHERE user_id = $1) THEN u2.avatar_url
        ELSE u1.avatar_url
      END as owner_avatar
    FROM matches m
    JOIN pets p1 ON m.pet_1_id = p1.id
    JOIN pets p2 ON m.pet_2_id = p2.id
    JOIN users u1 ON p1.user_id = u1.id
    JOIN users u2 ON p2.user_id = u2.id
    WHERE m.status = 'matched'
      AND (m.pet_1_id IN (SELECT id FROM pets WHERE user_id = $1)
        OR m.pet_2_id IN (SELECT id FROM pets WHERE user_id = $1))
    ORDER BY m.matched_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [userId, limit]);
  return result.rows;
};

/**
 * Get a specific match by ID
 */
export const getMatchById = async (matchId: string, userId: string) => {
  const query = `
    SELECT 
      m.*,
      p1.name as pet_1_name, p1.breed as pet_1_breed, p1.age as pet_1_age, 
      p1.species as pet_1_species, p1.photo_url as pet_1_photo,
      p1.energy_level as pet_1_energy_level, p1.temperament as pet_1_temperament,
      p2.name as pet_2_name, p2.breed as pet_2_breed, p2.age as pet_2_age,
      p2.species as pet_2_species, p2.photo_url as pet_2_photo,
      p2.energy_level as pet_2_energy_level, p2.temperament as pet_2_temperament,
      u1.full_name as owner_1_name, u1.avatar_url as owner_1_avatar,
      u2.full_name as owner_2_name, u2.avatar_url as owner_2_avatar
    FROM matches m
    JOIN pets p1 ON m.pet_1_id = p1.id
    JOIN pets p2 ON m.pet_2_id = p2.id
    JOIN users u1 ON p1.user_id = u1.id
    JOIN users u2 ON p2.user_id = u2.id
    WHERE m.id = $1
      AND (p1.user_id = $2 OR p2.user_id = $2)
  `;

  const result = await pool.query(query, [matchId, userId]);
  return result.rows[0];
};

/**
 * Get match stats for a user
 */
export const getMatchStats = async (userId: string): Promise<MatchStats> => {
  const query = `
    SELECT 
      COUNT(CASE WHEN status = 'matched' THEN 1 END) as total_matches,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_swipes,
      COUNT(CASE WHEN pet_1_liked = TRUE OR pet_2_liked = TRUE THEN 1 END) as total_likes
    FROM matches
    WHERE pet_1_id IN (SELECT id FROM pets WHERE user_id = $1)
       OR pet_2_id IN (SELECT id FROM pets WHERE user_id = $1)
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

/**
 * Unmatch a connection
 */
export const unmatch = async (matchId: string, userId: string) => {
  const query = `
    UPDATE matches m
    SET status = 'unmatched', updated_at = NOW()
    WHERE m.id = $1
      AND (m.pet_1_id IN (SELECT id FROM pets WHERE user_id = $2)
        OR m.pet_2_id IN (SELECT id FROM pets WHERE user_id = $2))
    RETURNING *
  `;

  const result = await pool.query(query, [matchId, userId]);
  return result.rows[0];
};

/**
 * Delete a match permanently
 */
export const deleteMatch = async (matchId: string) => {
  const query = `
    DELETE FROM matches
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [matchId]);
  return result.rows[0];
};

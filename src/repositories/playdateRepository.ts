import pool from '../config/db';

export interface PlaydateData {
  match_id: string;
  pet_id: string;
  invited_pet_id: string;
  title: string;
  location_name: string;
  location_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes?: number;
  message?: string | null;
}

export interface PlaydateUpdateData {
  status?: string;
  declined_reason?: string | null;
  responded_at?: string;
  completed_at?: string;
  cancelled_at?: string;
}

/**
 * Create a new playdate request
 */
export const createPlaydate = async (playdateData: PlaydateData) => {
  const {
    match_id,
    pet_id,
    invited_pet_id,
    title,
    location_name,
    location_address,
    latitude,
    longitude,
    scheduled_date,
    scheduled_time,
    duration_minutes,
    message,
  } = playdateData;

  const query = `
    INSERT INTO playdates (
      match_id, pet_id, invited_pet_id, title, location_name,
      location_address, latitude, longitude, scheduled_date, scheduled_time,
      duration_minutes, message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const values = [
    match_id,
    pet_id,
    invited_pet_id,
    title,
    location_name,
    location_address || null,
    latitude || null,
    longitude || null,
    scheduled_date,
    scheduled_time,
    duration_minutes || 60,
    message || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Get all playdates for a pet (both sent and received)
 */
export const getPlaydatesByPetId = async (petId: string, status?: string, limit: number = 50) => {
  return getPlaydatesByPetIds([petId], status, limit);
};

/**
 * Get all playdates for multiple pet IDs (both sent and received)
 */
export const getPlaydatesByPetIds = async (petIds: string[], status?: string, limit: number = 50) => {
  let query = `
    SELECT
      p.*,
      inv_pet.name as invited_pet_name,
      inv_pet.breed as invited_pet_breed,
      inv_pet.age as invited_pet_age,
      inv_pet.species as invited_pet_species,
      inv_pet.photo_url as invited_pet_photo,
      inv_pet.energy_level as invited_pet_energy_level,
      inv_user.full_name as invited_owner_name,
      inv_user.avatar_url as invited_owner_avatar,
      sender_pet.name as sender_pet_name,
      sender_pet.breed as sender_pet_breed,
      sender_pet.age as sender_pet_age,
      sender_pet.species as sender_pet_species,
      sender_pet.photo_url as sender_pet_photo,
      sender_user.full_name as sender_owner_name,
      sender_user.avatar_url as sender_owner_avatar
    FROM playdates p
    JOIN pets inv_pet ON p.invited_pet_id = inv_pet.id
    JOIN pets sender_pet ON p.pet_id = sender_pet.id
    JOIN users inv_user ON inv_pet.user_id = inv_user.id
    JOIN users sender_user ON sender_pet.user_id = sender_user.id
    WHERE (p.pet_id = ANY($1) OR p.invited_pet_id = ANY($1))
  `;

  const values: any[] = [petIds];
  let paramIndex = 2;

  if (status) {
    query += ` AND p.status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }

  query += ` ORDER BY p.scheduled_date DESC, p.scheduled_time DESC LIMIT $${paramIndex}`;
  values.push(limit);

  console.log('=== PLAYDATE QUERY ===');
  console.log('SQL:', query);
  console.log('Values:', values);
  console.log('Status filter:', status);
  const result = await pool.query(query, values);
  console.log('Found', result.rows.length, 'playdates for status:', status);
  if (result.rows.length > 0) {
    console.log('First playdate status:', result.rows[0].status);
  }
  return result.rows;
};

/**
 * Get a specific playdate by ID with ownership check
 */
export const getPlaydateById = async (playdateId: string, userId: string) => {
  const query = `
    SELECT 
      p.*,
      inv_pet.name as invited_pet_name,
      inv_pet.breed as invited_pet_breed,
      inv_pet.age as invited_pet_age,
      inv_pet.species as invited_pet_species,
      inv_pet.photo_url as invited_pet_photo,
      inv_pet.energy_level as invited_pet_energy_level,
      inv_user.full_name as invited_owner_name,
      inv_user.avatar_url as invited_owner_avatar,
      sender_pet.name as sender_pet_name,
      sender_pet.breed as sender_pet_breed,
      sender_pet.age as sender_pet_age,
      sender_pet.species as sender_pet_species,
      sender_pet.photo_url as sender_pet_photo,
      sender_user.full_name as sender_owner_name,
      sender_user.avatar_url as sender_owner_avatar
    FROM playdates p
    JOIN pets inv_pet ON p.invited_pet_id = inv_pet.id
    JOIN pets sender_pet ON p.pet_id = sender_pet.id
    JOIN users inv_user ON inv_pet.user_id = inv_user.id
    JOIN users sender_user ON sender_pet.user_id = sender_user.id
    WHERE p.id = $1
      AND (sender_pet.user_id = $2 OR inv_pet.user_id = $2)
  `;

  const result = await pool.query(query, [playdateId, userId]);
  return result.rows[0];
};

/**
 * Update playdate status
 */
export const updatePlaydateStatus = async (
  playdateId: string,
  userId: string,
  status: string,
  reason?: string
) => {
  const allowedStatuses = ['pending', 'accepted', 'declined', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const updates: string[] = ['status = $3'];
  const values: any[] = [playdateId, userId, status];
  let paramIndex = 4;

  // Add timestamp based on status
  if (status === 'accepted' || status === 'declined') {
    updates.push(`responded_at = NOW()`);
  } else if (status === 'completed') {
    updates.push(`completed_at = NOW()`);
  } else if (status === 'cancelled') {
    updates.push(`cancelled_at = NOW()`);
  }

  // Add reason if provided
  if (reason && (status === 'declined' || status === 'cancelled')) {
    updates.push(`declined_reason = $${paramIndex}`);
    values.push(reason);
    paramIndex++;
  }

  updates.push('updated_at = NOW()');

  const query = `
    UPDATE playdates p
    SET ${updates.join(', ')}
    WHERE p.id = $1
      AND (
        p.pet_id IN (SELECT id FROM pets WHERE user_id = $2)
        OR p.invited_pet_id IN (SELECT id FROM pets WHERE user_id = $2)
      )
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Get playdates by match ID
 */
export const getPlaydatesByMatchId = async (matchId: string, userId: string) => {
  const query = `
    SELECT 
      p.*,
      inv_pet.name as invited_pet_name,
      inv_pet.breed as invited_pet_breed,
      inv_pet.photo_url as invited_pet_photo,
      inv_user.full_name as invited_owner_name,
      sender_pet.name as sender_pet_name,
      sender_pet.breed as sender_pet_breed,
      sender_pet.photo_url as sender_pet_photo,
      sender_user.full_name as sender_owner_name
    FROM playdates p
    JOIN pets inv_pet ON p.invited_pet_id = inv_pet.id
    JOIN pets sender_pet ON p.pet_id = sender_pet.id
    JOIN users inv_user ON inv_pet.user_id = inv_user.id
    JOIN users sender_user ON sender_pet.user_id = sender_user.id
    WHERE p.match_id = $1
      AND (sender_pet.user_id = $2 OR inv_pet.user_id = $2)
    ORDER BY p.scheduled_date DESC, p.scheduled_time DESC
  `;

  const result = await pool.query(query, [matchId, userId]);
  return result.rows;
};

/**
 * Get pending playdate count for a pet
 */
export const getPendingPlaydateCount = async (petId: string) => {
  const query = `
    SELECT COUNT(*) as count
    FROM playdates
    WHERE (pet_id = $1 OR invited_pet_id = $1)
      AND status = 'pending'
  `;

  const result = await pool.query(query, [petId]);
  return parseInt(result.rows[0].count);
};

/**
 * Delete a playdate (soft delete - set to cancelled)
 */
export const cancelPlaydateSoft = async (playdateId: string, userId: string) => {
  return updatePlaydateStatus(playdateId, userId, 'cancelled', 'Deleted by user');
};

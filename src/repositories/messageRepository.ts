import pool from '../config/db';

/**
 * Save a message to the database
 */
export const saveMessage = async (
  matchId: string,
  senderId: string,
  messageText?: string,
  imageUrl?: string,
  imagePublicId?: string
) => {
  const query = `
    INSERT INTO messages (match_id, sender_id, message_text, image_url, image_public_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [matchId, senderId, messageText || null, imageUrl || null, imagePublicId || null];
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Get all messages for a match
 */
export const getMessagesByMatchId = async (matchId: string, limit: number = 50, offset: number = 0) => {
  // Use DISTINCT ON to prevent duplicates from JOIN with pets table
  const query = `
    SELECT DISTINCT ON (m.id)
      m.id,
      m.match_id,
      m.sender_id,
      m.message_text,
      m.image_url,
      m.image_public_id,
      m.is_deleted,
      m.created_at,
      m.updated_at,
      u.id as sender_user_id,
      u.full_name as sender_name,
      u.avatar_url as sender_avatar,
      p.id as pet_id,
      p.name as pet_name,
      p.photo_url as pet_photo
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    LEFT JOIN pets p ON p.user_id = u.id AND p.is_active = TRUE
    WHERE m.match_id = $1
      AND m.is_deleted = FALSE
    ORDER BY m.id, p.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const result = await pool.query(query, [matchId, limit, offset]);
  
  // Sort by created_at ascending (oldest first)
  return result.rows.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
};

/**
 * Get match participants (both users involved in a match)
 */
export const getMatchParticipants = async (matchId: string) => {
  const query = `
    SELECT
      u1.id as user_1_id,
      u1.full_name as user_1_name,
      u1.avatar_url as user_1_avatar,
      u2.id as user_2_id,
      u2.full_name as user_2_name,
      u2.avatar_url as user_2_avatar,
      p1.id as pet_1_id,
      p1.name as pet_1_name,
      p1.photo_url as pet_1_photo,
      p2.id as pet_2_id,
      p2.name as pet_2_name,
      p2.photo_url as pet_2_photo
    FROM matches mat
    JOIN pets p1 ON mat.pet_1_id = p1.id
    JOIN pets p2 ON mat.pet_2_id = p2.id
    JOIN users u1 ON p1.user_id = u1.id
    JOIN users u2 ON p2.user_id = u2.id
    WHERE mat.id = $1
  `;

  const result = await pool.query(query, [matchId]);
  return result.rows[0];
};

/**
 * Get latest message for a match
 */
export const getLatestMessage = async (matchId: string) => {
  const query = `
    SELECT
      m.*,
      u.full_name as sender_name,
      u.avatar_url as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.match_id = $1
      AND m.is_deleted = FALSE
    ORDER BY m.created_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [matchId]);
  return result.rows[0];
};

/**
 * Get unread message count for a user
 */
export const getUnreadCount = async (userId: string) => {
  const query = `
    SELECT COUNT(DISTINCT m.match_id) as unread_matches
    FROM messages m
    JOIN matches mat ON m.match_id = mat.id
    WHERE m.sender_id != $1
      AND (mat.pet_1_id IN (SELECT id FROM pets WHERE user_id = $1)
        OR mat.pet_2_id IN (SELECT id FROM pets WHERE user_id = $1))
      AND m.created_at > NOW() - INTERVAL '24 hours'
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0].unread_matches;
};

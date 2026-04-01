import pool from '../config/db';

export interface VerificationRequestData {
  pet_id: string;
  user_id: string;
  document_url: string;
  document_public_id: string;
  document_type: 'vaccination_certificate' | 'vet_certificate' | 'medical_record';
  notes?: string;
}

export interface VerificationUpdateData {
  status?: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  rejection_reason?: string;
}

/**
 * Create a new verification request
 */
export const createVerificationRequest = async (data: VerificationRequestData) => {
  const {
    pet_id,
    user_id,
    document_url,
    document_public_id,
    document_type,
    notes,
  } = data;

  const query = `
    INSERT INTO verification_requests (
      pet_id, user_id, document_url, document_public_id, 
      document_type, notes
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    pet_id,
    user_id,
    document_url,
    document_public_id,
    document_type,
    notes || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Get verification requests for a pet
 */
export const getVerificationRequestsByPetId = async (petId: string, limit: number = 10) => {
  const query = `
    SELECT vr.*, u.full_name as reviewer_name
    FROM verification_requests vr
    LEFT JOIN users u ON vr.reviewed_by = u.id
    WHERE vr.pet_id = $1
    ORDER BY vr.created_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [petId, limit]);
  return result.rows;
};

/**
 * Get pending verification requests (for admin)
 */
export const getPendingVerificationRequests = async (limit: number = 50) => {
  const query = `
    SELECT 
      vr.*,
      p.name as pet_name,
      p.breed as pet_breed,
      p.species as pet_species,
      u.full_name as owner_name,
      u.email as owner_email,
      u.phone as owner_phone
    FROM verification_requests vr
    JOIN pets p ON vr.pet_id = p.id
    JOIN users u ON vr.user_id = u.id
    WHERE vr.status = 'pending'
    ORDER BY vr.created_at ASC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};

/**
 * Get a single verification request by ID
 */
export const getVerificationRequestById = async (requestId: string) => {
  const query = `
    SELECT 
      vr.*,
      p.name as pet_name,
      p.breed as pet_breed,
      u.full_name as owner_name
    FROM verification_requests vr
    JOIN pets p ON vr.pet_id = p.id
    JOIN users u ON vr.user_id = u.id
    WHERE vr.id = $1
  `;

  const result = await pool.query(query, [requestId]);
  return result.rows[0];
};

/**
 * Update verification request status
 */
export const updateVerificationRequest = async (
  requestId: string,
  updateData: VerificationUpdateData
) => {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updateData.status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    values.push(updateData.status);
    paramIndex++;
  }

  if (updateData.reviewed_by !== undefined) {
    updates.push(`reviewed_by = $${paramIndex}`);
    values.push(updateData.reviewed_by);
    paramIndex++;
  }

  if (updateData.rejection_reason !== undefined) {
    updates.push(`rejection_reason = $${paramIndex}`);
    values.push(updateData.rejection_reason);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new Error('No valid fields to update');
  }

  updates.push(`reviewed_at = NOW()`);
  updates.push(`updated_at = NOW()`);
  values.push(requestId);

  const query = `
    UPDATE verification_requests
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Get user's verification requests count
 */
export const countVerificationRequestsByUserId = async (
  userId: string,
  status?: 'pending' | 'approved' | 'rejected'
) => {
  let query = `
    SELECT COUNT(*) as count
    FROM verification_requests
    WHERE user_id = $1
  `;

  const values: any[] = [userId];

  if (status) {
    query += ` AND status = $${values.length + 1}`;
    values.push(status);
  }

  const result = await pool.query(query, values);
  return parseInt(result.rows[0].count);
};

/**
 * Delete a verification request
 */
export const deleteVerificationRequest = async (requestId: string) => {
  const query = `
    DELETE FROM verification_requests
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [requestId]);
  return result.rows[0];
};

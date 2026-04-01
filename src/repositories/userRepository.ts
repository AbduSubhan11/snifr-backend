import { query } from '../config/db';

export const createUser = async (email: string, passwordHash: string, fullName: string, phone: string) => {
  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, phone) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [email, passwordHash, fullName, phone]
  );
  return result.rows[0];
};

export const getUserByEmail = async (email: string) => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

export const getUserById = async (id: string) => {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
};

export const updateUserPassword = async (id: string, passwordHash: string) => {
  const result = await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, id]);
  return result.rowCount;
};

export const updateLastLogin = async (id: string) => {
  const result = await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
  return result.rowCount;
};

export const updateUserProfile = async (
  id: string,
  updates: {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    share_location?: boolean;
    location_visibility?: string;
  }
) => {
  const fields = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.full_name !== undefined) {
    fields.push(`full_name = $${paramIndex++}`);
    values.push(updates.full_name);
  }
  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(updates.phone);
  }
  if (updates.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIndex++}`);
    values.push(updates.avatar_url);
  }
  if (updates.share_location !== undefined) {
    fields.push(`share_location = $${paramIndex++}`);
    values.push(updates.share_location);
  }
  if (updates.location_visibility !== undefined) {
    fields.push(`location_visibility = $${paramIndex++}`);
    values.push(updates.location_visibility);
  }

  if (fields.length === 0) {
    return { rowCount: 0 };
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
};

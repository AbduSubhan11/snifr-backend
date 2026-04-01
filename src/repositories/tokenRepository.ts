import { query } from '../config/db';

// Refresh Tokens
export const createRefreshToken = async (userId: string, token: string, expiresAt: Date) => {
  const result = await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *`,
    [userId, token, expiresAt]
  );
  return result.rows[0];
};

export const getRefreshToken = async (token: string) => {
  const result = await query('SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = FALSE', [token]);
  return result.rows[0];
};

export const revokeRefreshToken = async (token: string) => {
  await query('UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE token = $1', [token]);
};

export const revokeAllUserRefreshTokens = async (userId: string) => {
  await query('UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE user_id = $1', [userId]);
};

// Password Reset Tokens
export const createPasswordResetToken = async (userId: string, token: string, expiresAt: Date) => {
  const result = await query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *`,
    [userId, token, expiresAt]
  );
  return result.rows[0];
};

export const getPasswordResetToken = async (token: string) => {
  const result = await query('SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE', [token]);
  return result.rows[0];
};

export const markPasswordResetTokenAsUsed = async (token: string) => {
  await query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);
};

// OTP Tokens
export const createOTPToken = async (userId: string, otpCode: string, expiresAt: Date) => {
  // Revoke any existing unused OTPs for this user
  await query('UPDATE otp_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [userId]);

  const result = await query(
    `INSERT INTO otp_tokens (user_id, otp_code, expires_at, max_attempts) VALUES ($1, $2, $3, 3) RETURNING *`,
    [userId, otpCode, expiresAt]
  );
  return result.rows[0];
};

export const getOTPToken = async (otpCode: string) => {
  const result = await query(
    `SELECT * FROM otp_tokens 
     WHERE otp_code = $1 
     AND used = FALSE 
     AND attempts < max_attempts
     AND expires_at > NOW()`,
    [otpCode]
  );
  return result.rows[0];
};

export const getOTPTokenWithUserCheck = async (otpCode: string, userId: string) => {
  const result = await query(
    `SELECT * FROM otp_tokens 
     WHERE otp_code = $1 
     AND user_id = $2 
     AND used = FALSE 
     AND attempts < max_attempts`,
    [otpCode, userId]
  );
  return result.rows[0];
};

export const incrementOTPAttempts = async (otpCode: string) => {
  await query('UPDATE otp_tokens SET attempts = attempts + 1 WHERE otp_code = $1', [otpCode]);
};

export const markOTPTokenAsUsed = async (otpCode: string) => {
  await query('UPDATE otp_tokens SET used = TRUE WHERE otp_code = $1', [otpCode]);
};

export const getOTPDebugInfo = async (otpCode: string) => {
  const result = await query(
    'SELECT otp_code, user_id, used, attempts, max_attempts, expires_at, NOW() as current_time FROM otp_tokens WHERE otp_code = $1',
    [otpCode]
  );
  return result.rows[0];
};

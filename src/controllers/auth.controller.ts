import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendSuccess, sendError } from '../utils/response';
import { createUser, getUserByEmail, getUserById, updateUserPassword, updateLastLogin, updateUserProfile } from '../repositories/userRepository';
import { createRefreshToken, getRefreshToken, revokeRefreshToken, revokeAllUserRefreshTokens, createPasswordResetToken, getPasswordResetToken, markPasswordResetTokenAsUsed, createOTPToken, getOTPToken, getOTPTokenWithUserCheck, incrementOTPAttempts, markOTPTokenAsUsed, getOTPDebugInfo } from '../repositories/tokenRepository';
import sendEmail from '../utils/sendEmail';

const generateTokens = (user: any) => {
  const token = jwt.sign({ id: user.id }, process.env.JWT_ACCESS_SECRET || 'access_secret', { expiresIn: '15m' });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  return { token, refreshToken };
};

const formatUser = (user: any) => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name,
  phone: user.phone,
  avatar: user.avatar_url || null,
  emailVerified: user.email_verified,
  createdAt: user.created_at,
  lastLoginAt: user.last_login_at,
  shareLocation: user.share_location || false,
  locationVisibility: user.location_visibility || 'matches'
});

export const register = async (req: Request, res: Response) => {
  const { email, password, fullName, phone } = req.body;
  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) return sendError(res, 'Email already in use', 'EMAIL_EXISTS', 400);

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await createUser(email, passwordHash, fullName, phone);
    const { token, refreshToken } = generateTokens(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await createRefreshToken(user.id, refreshToken, expiresAt);

    return sendSuccess(res, 'User registered successfully', {
      user: formatUser(user),
      token,
      refreshToken
    }, 201);
  } catch (error: any) {
    return sendError(res, 'Server error', error.message, 500);
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await getUserByEmail(email);
    if (!user) return sendError(res, 'Invalid credentials', 'INVALID_CREDENTIALS', 401);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return sendError(res, 'Invalid credentials', 'INVALID_CREDENTIALS', 401);

    // Update last login timestamp
    await updateLastLogin(user.id);

    const { token, refreshToken } = generateTokens(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await createRefreshToken(user.id, refreshToken, expiresAt);

    return sendSuccess(res, 'Login successful', {
      user: formatUser(user),
      token,
      refreshToken
    });
  } catch (error: any) {
    return sendError(res, 'Server error', error.message, 500);
  }
};

export const logout = async (req: any, res: Response) => {
  try {
    await revokeAllUserRefreshTokens(req.user.id);
    return sendSuccess(res, 'Logged out successfully', null, 200);
  } catch (error: any) {
    return sendError(res, 'Server error', error.message, 500);
  }
};

export const updateProfile = async (req: any, res: Response) => {
  const { fullName, phone, avatarUrl, shareLocation, locationVisibility } = req.body;
  
  try {
    const updates: any = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
    if (shareLocation !== undefined) updates.share_location = shareLocation;
    if (locationVisibility !== undefined) updates.location_visibility = locationVisibility;

    const user = await updateUserProfile(req.user.id, updates);
    
    return sendSuccess(res, 'Profile updated successfully', {
      user: formatUser(user)
    });
  } catch (error: any) {
    return sendError(res, 'Server error', error.message, 500);
  }
};

export const me = async (req: any, res: Response) => {
  return sendSuccess(res, 'User retrieved', { user: formatUser(req.user) });
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return sendError(res, 'Refresh token required', 'NO_TOKEN', 400);

  try {
    const dbToken = await getRefreshToken(refreshToken);
    if (!dbToken) return sendError(res, 'Invalid or expired refresh token', 'INVALID_TOKEN', 401);

    if (new Date(dbToken.expires_at) < new Date()) {
      return sendError(res, 'Refresh token expired', 'TOKEN_EXPIRED', 401);
    }

    const user = await getUserById(dbToken.user_id);
    if (!user) return sendError(res, 'User not found', 'USER_NOT_FOUND', 401);

    await revokeRefreshToken(refreshToken);

    const tokens = generateTokens(user);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await createRefreshToken(user.id, tokens.refreshToken, expiresAt);

    return sendSuccess(res, 'Token refreshed successfully', {
      token: tokens.token,
      refreshToken: tokens.refreshToken
    });
  } catch (error: any) {
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * STEP 1: Send OTP to user's email
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await getUserByEmail(email);
    if (!user) return sendError(res, 'There is no user with that email', 'USER_NOT_FOUND', 404);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    await createOTPToken(user.id, otpCode, expiresAt);

    const htmlMessage = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
      .container { background-color: #f9f9f9; padding: 30px; border-radius: 12px; text-align: center; }
      .logo { font-size: 28px; font-weight: bold; color: #A07FDB; margin-bottom: 20px; }
      h1 { color: #333; font-size: 22px; margin-bottom: 20px; }
      .otp-box { background-color: #fff; border: 2px dashed #A07FDB; padding: 20px; border-radius: 8px; margin: 20px 0; }
      .otp-code { font-size: 32px; font-weight: bold; color: #A07FDB; letter-spacing: 8px; }
      .warning { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; color: #856404; }
      .footer { margin-top: 30px; font-size: 12px; color: #999; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">🐾 Snifr</div>
      <h1>Password Reset Request</h1>
      <p>Hi ${user.full_name},</p>
      <p>You requested to reset your password. Use the OTP code below:</p>
      <div class="otp-box">
        <div class="otp-code">${otpCode}</div>
      </div>
      <p class="warning">
        <strong>⏰ This OTP expires in 10 minutes</strong><br>
        You have 3 attempts to enter the correct code.
      </p>
      <p class="footer">
        If you didn't request a password reset, you can safely ignore this email.<br>
        Your password will remain unchanged.
      </p>
    </div>
  </body>
</html>`;

    const textMessage = `
Hi ${user.full_name},

You requested to reset your password for Snifr.

Your OTP code is: ${otpCode}

This code expires in 10 minutes.
You have 3 attempts to enter the correct code.

If you didn't request this, please ignore this email.
Your password will remain unchanged.

— The Snifr Team
    `;

    // Try to send email, log to console if SMTP not configured
    try {
      await sendEmail({
        email: user.email,
        subject: 'Your Password Reset OTP - Snifr',
        message: textMessage,
        html: htmlMessage
      });
    } catch (emailError: any) {
      // If email fails, log the OTP to console for testing
      console.log('\n📧 EMAIL NOT SENT (SMTP not configured)');
      console.log('==========================================');
      console.log(`📧 To: ${user.email}`);
      console.log(`🔢 OTP Code: ${otpCode}`);
      console.log('==========================================\n');
    }

    return sendSuccess(res, 'OTP sent to your email', null, 200);
  } catch (error: any) {
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * STEP 2: Verify OTP
 */
export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    const user = await getUserByEmail(email);
    if (!user) return sendError(res, 'There is no user with that email', 'USER_NOT_FOUND', 404);

    // Get OTP without expiry check first, so we can give specific error
    const otpToken = await getOTPTokenWithUserCheck(otp, user.id);

    if (!otpToken) {
      // Check why it failed
      const debugInfo = await getOTPDebugInfo(otp);
      
      if (!debugInfo) {
        return sendError(res, 'Invalid OTP. Please check and try again', 'INVALID_OTP', 400);
      }
      
      if (debugInfo.user_id !== user.id) {
        return sendError(res, 'OTP does not match this email', 'INVALID_OTP', 400);
      }
      
      if (debugInfo.used) {
        return sendError(res, 'This OTP has already been used', 'OTP_ALREADY_USED', 400);
      }
      
      if (debugInfo.attempts >= debugInfo.max_attempts) {
        return sendError(res, 'Maximum attempts (3) reached. Please request a new OTP', 'MAX_ATTEMPTS_REACHED', 400);
      }
      
      if (new Date(debugInfo.expires_at) < new Date()) {
        return sendError(res, 'OTP has expired. Please request a new one', 'OTP_EXPIRED', 400);
      }
      
      return sendError(res, 'Invalid or expired OTP', 'INVALID_OTP', 400);
    }

    return sendSuccess(res, 'OTP verified successfully', null, 200);
  } catch (error: any) {
    console.error('Verify OTP Error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * STEP 3: Reset Password after OTP verification
 */
export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, password } = req.body;
  try {
    const user = await getUserByEmail(email);
    if (!user) return sendError(res, 'There is no user with that email', 'USER_NOT_FOUND', 404);

    // Get OTP with full info for better error messages
    const otpToken = await getOTPTokenWithUserCheck(otp, user.id);

    if (!otpToken) {
      // Increment attempts for invalid OTP
      await incrementOTPAttempts(otp);
      
      // Get debug info to provide specific error
      const debugInfo = await getOTPDebugInfo(otp);
      
      if (!debugInfo) {
        return sendError(res, 'Invalid OTP. Please check and try again', 'INVALID_OTP', 400);
      }
      
      if (debugInfo.user_id !== user.id) {
        return sendError(res, 'OTP does not match this email', 'INVALID_OTP', 400);
      }
      
      if (debugInfo.used) {
        return sendError(res, 'This OTP has already been used', 'OTP_ALREADY_USED', 400);
      }
      
      if (debugInfo.attempts >= debugInfo.max_attempts) {
        return sendError(res, 'Maximum attempts (3) reached. Please request a new OTP', 'MAX_ATTEMPTS_REACHED', 400);
      }
      
      if (new Date(debugInfo.expires_at) < new Date()) {
        return sendError(res, 'OTP has expired. Please request a new one', 'OTP_EXPIRED', 400);
      }
      
      return sendError(res, 'Invalid OTP', 'INVALID_OTP', 400);
    }

    if (new Date(otpToken.expires_at) < new Date()) {
      return sendError(res, 'OTP has expired. Please request a new one', 'OTP_EXPIRED', 400);
    }

    if (otpToken.attempts >= otpToken.max_attempts) {
      return sendError(res, 'Maximum attempts reached. Please request a new OTP', 'MAX_ATTEMPTS_REACHED', 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    await updateUserPassword(user.id, passwordHash);
    await markOTPTokenAsUsed(otp);

    return sendSuccess(res, 'Password reset successful', null, 200);
  } catch (error: any) {
    console.error('Reset Password Error:', error.message);
    return sendError(res, 'Server error', error.message, 500);
  }
};

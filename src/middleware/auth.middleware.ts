import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';
import { getUserById } from '../repositories/userRepository';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 'Not authorized to access this route', 'NO_TOKEN', 401);
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'access_secret');
    const user = await getUserById(decoded.id);

    if (!user) {
      return sendError(res, 'User no longer exists', 'USER_NOT_FOUND', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 'Not authorized to access this route', 'INVALID_TOKEN', 401);
  }
};

/**
 * Admin only middleware - checks if user has admin privileges
 */
export const adminOnly = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return sendError(res, 'Not authenticated', 'NO_USER', 401);
  }

  if (!req.user.is_admin) {
    return sendError(res, 'Admin access required', 'ADMIN_ONLY', 403);
  }

  next();
};

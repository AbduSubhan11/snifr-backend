import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/response';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format error string for first validation failure
    const mappedErrors = errors.array().map(e => e.msg).join(', ');
    return sendError(res, mappedErrors, 'VALIDATION_ERROR', 400);
  }
  next();
};

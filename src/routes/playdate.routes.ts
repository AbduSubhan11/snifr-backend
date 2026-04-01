import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createPlaydateRequest,
  getUserPlaydates,
  getPlaydateByIdController,
  acceptPlaydate,
  declinePlaydate,
  cancelPlaydate,
  completePlaydate,
  getPlaydatesByMatch,
} from '../controllers/playdate.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Validation Rules
const createPlaydateRules = [
  body('matchId').isUUID().withMessage('Invalid match ID'),
  body('invitedPetId').isUUID().withMessage('Invalid invited pet ID'),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 150 }).withMessage('Title must be less than 150 characters'),
  body('locationName').trim().notEmpty().withMessage('Location name is required').isLength({ max: 200 }).withMessage('Location name must be less than 200 characters'),
  body('locationAddress').optional().trim(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('scheduledDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Invalid date format. Use YYYY-MM-DD'),
  body('scheduledTime').matches(/^\d{2}:\d{2}$/).withMessage('Invalid time format. Use HH:MM'),
  body('durationMinutes').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
  body('message').optional().trim(),
];

const playdateIdRules = [
  param('id').isUUID().withMessage('Invalid playdate ID'),
];

const playdateStatusRules = [
  param('id').isUUID().withMessage('Invalid playdate ID'),
  body('reason').optional().trim(),
];

const getPlaydatesRules = [
  query('status').optional().isIn(['pending', 'accepted', 'declined', 'completed', 'cancelled']).withMessage('Invalid status'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// Routes

// Create playdate request
router.post('/', createPlaydateRules, validate, createPlaydateRequest);

// Get all playdates
router.get('/', getPlaydatesRules, validate, getUserPlaydates);

// Get playdates by match ID
router.get('/match/:matchId', playdateIdRules, validate, getPlaydatesByMatch);

// Get specific playdate
router.get('/:id', playdateIdRules, validate, getPlaydateByIdController);

// Accept playdate
router.patch('/:id/accept', playdateIdRules, validate, acceptPlaydate);

// Decline playdate
router.patch('/:id/decline', playdateStatusRules, validate, declinePlaydate);

// Cancel playdate
router.patch('/:id/cancel', playdateStatusRules, validate, cancelPlaydate);

// Complete playdate
router.patch('/:id/complete', playdateIdRules, validate, completePlaydate);

export default router;

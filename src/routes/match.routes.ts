import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getDiscoverPets,
  swipePet,
  getUserMatches,
  getMatchByIdController,
  getMatchStatsController,
  unmatchController,
  getPendingRequests,
  acceptMatchRequest,
  declineMatchRequest,
} from '../controllers/match.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Validation Rules
const swipeRules = [
  body('targetPetId').isUUID().withMessage('Invalid target pet ID'),
  body('userPetId').isUUID().withMessage('Invalid user pet ID'),
  body('liked').isBoolean().withMessage('Liked must be a boolean'),
];

const matchIdRules = [
  param('id').isUUID().withMessage('Invalid match ID'),
];

const discoverRules = [
  query('species').optional().isIn(['Dog', 'Cat']).withMessage('Species must be Dog or Cat'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// Routes

// Get pets available for swiping
router.get('/discover', discoverRules, validate, getDiscoverPets);

// Get pending match requests
router.get('/pending', getPendingRequests);

// Swipe on a pet (like/dislike)
router.post('/swipe', swipeRules, validate, swipePet);

// Get all matches
router.get('/', getUserMatches);

// Get match statistics
router.get('/stats', getMatchStatsController);

// Accept pending match request
router.patch('/:id/accept', matchIdRules, validate, acceptMatchRequest);

// Decline pending match request
router.patch('/:id/decline', matchIdRules, validate, declineMatchRequest);

// Get specific match
router.get('/:id', matchIdRules, validate, getMatchByIdController);

// Unmatch
router.delete('/:id', matchIdRules, validate, unmatchController);

export default router;

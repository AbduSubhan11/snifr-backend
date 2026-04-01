import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createPetProfile,
  getUserPets,
  getPetById,
  updatePetProfile,
  deletePetProfile,
  verifyPetProfile,
} from '../controllers/pet.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Validation Rules
const createPetRules = [
  body('name').trim().notEmpty().withMessage('Pet name is required'),
  body('breed').trim().notEmpty().withMessage('Breed is required'),
  body('age').isInt({ min: 0, max: 50 }).withMessage('Age must be between 0 and 50'),
  body('gender').isIn(['Male', 'Female']).withMessage('Gender must be Male or Female'),
  body('species').optional().isIn(['Dog', 'Cat']).withMessage('Species must be Dog or Cat'),
  body('temperament').optional().trim(),
  body('energyLevel').optional().isIn(['Low', 'Medium', 'High']).withMessage('Energy level must be Low, Medium, or High'),
  body('weight').optional().isFloat({ min: 0, max: 200 }).withMessage('Weight must be between 0 and 200 kg'),
  body('color').optional().trim(),
  body('bio').optional().trim(),
  body('photos').optional().isArray(),
  body('vaccinationStatus').optional().isBoolean(),
];

const updatePetRules = [
  param('id').isUUID().withMessage('Invalid pet ID'),
  body('name').optional().trim().notEmpty().withMessage('Pet name cannot be empty'),
  body('breed').optional().trim().notEmpty().withMessage('Breed cannot be empty'),
  body('age').optional().isInt({ min: 0, max: 50 }).withMessage('Age must be between 0 and 50'),
  body('gender').optional().isIn(['Male', 'Female']).withMessage('Gender must be Male or Female'),
  body('species').optional().isIn(['Dog', 'Cat']).withMessage('Species must be Dog or Cat'),
  body('temperament').optional().trim(),
  body('energyLevel').optional().isIn(['Low', 'Medium', 'High']).withMessage('Energy level must be Low, Medium, or High'),
  body('weight').optional().isFloat({ min: 0, max: 200 }).withMessage('Weight must be between 0 and 200 kg'),
  body('color').optional().trim(),
  body('bio').optional().trim(),
  body('photos').optional().isArray(),
  body('vaccinationStatus').optional().isBoolean(),
];

const petIdRules = [
  param('id').isUUID().withMessage('Invalid pet ID'),
];

// Routes
router.post('/', createPetRules, validate, createPetProfile);
router.get('/', getUserPets);
router.get('/:id', petIdRules, validate, getPetById);
router.put('/:id', updatePetRules, validate, updatePetProfile);
router.delete('/:id', petIdRules, validate, deletePetProfile);
router.patch('/:id/verify', petIdRules, validate, verifyPetProfile);

export default router;

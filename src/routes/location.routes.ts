import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  updateLocation,
  getLocationSettings,
  toggleLocationShare,
  updateLocationVisibility,
  getNearby,
  stopSharingLocation
} from '../controllers/location.controller';

const router = Router();

// All routes require authentication
router.use(protect);

// Location management routes
router.post('/update', updateLocation);
router.get('/settings', getLocationSettings);
router.patch('/toggle-share', toggleLocationShare);
router.patch('/visibility', updateLocationVisibility);
router.delete('/', stopSharingLocation);

// Discovery routes
router.get('/nearby', getNearby);

export default router;

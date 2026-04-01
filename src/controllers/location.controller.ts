import { Request, Response } from 'express';
import { query } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import {
  updateUserLocation,
  getUserLocationSettings,
  getNearbyUsers,
  getNearbyMatches,
  clearUserLocation,
  getAllLocationSharingUsers
} from '../repositories/locationRepository';

/**
 * Update user's location sharing settings and coordinates
 * POST /api/location/update
 */
export const updateLocation = async (req: any, res: Response) => {
  const { latitude, longitude, accuracy, shareLocation, locationVisibility } = req.body;

  // Validation
  if (latitude === undefined || longitude === undefined) {
    return sendError(res, 'Latitude and longitude are required', 'MISSING_LOCATION', 400);
  }

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return sendError(res, 'Latitude and longitude must be numbers', 'INVALID_LOCATION', 400);
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return sendError(res, 'Invalid latitude or longitude values', 'INVALID_LOCATION', 400);
  }

  try {
    await updateUserLocation(
      req.user.id,
      {
        userId: req.user.id,
        latitude,
        longitude,
        accuracy,
        shareLocation: shareLocation ?? true,
        locationVisibility: locationVisibility || 'matches'
      }
    );

    return sendSuccess(res, 'Location updated successfully', {
      latitude,
      longitude,
      accuracy,
      shareLocation: shareLocation ?? true,
      locationVisibility: locationVisibility || 'matches',
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update location error:', error);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get user's current location settings
 * GET /api/location/settings
 */
export const getLocationSettings = async (req: any, res: Response) => {
  try {
    const settings = await getUserLocationSettings(req.user.id);

    if (!settings) {
      return sendError(res, 'User not found', 'USER_NOT_FOUND', 404);
    }

    return sendSuccess(res, 'Location settings retrieved', {
      shareLocation: settings.share_location,
      locationVisibility: settings.location_visibility,
      latitude: settings.latitude,
      longitude: settings.longitude,
      locationUpdatedAt: settings.location_updated_at
    });
  } catch (error: any) {
    console.error('Get location settings error:', error);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Toggle location sharing on/off
 * PATCH /api/location/toggle-share
 */
export const toggleLocationShare = async (req: any, res: Response) => {
  const { shareLocation } = req.body;

  if (typeof shareLocation !== 'boolean') {
    return sendError(res, 'shareLocation must be a boolean', 'INVALID_VALUE', 400);
  }

  try {
    const currentSettings = await getUserLocationSettings(req.user.id);

    if (!currentSettings) {
      return sendError(res, 'User not found', 'USER_NOT_FOUND', 404);
    }

    // If turning off sharing, clear the location
    if (!shareLocation) {
      await clearUserLocation(req.user.id);
    }

    // Update just the share_location field
    await query(
      `UPDATE users
       SET share_location = $1
       WHERE id = $2`,
      [shareLocation, req.user.id]
    );

    return sendSuccess(res, 'Location sharing updated', {
      shareLocation,
      locationCleared: !shareLocation
    });
  } catch (error: any) {
    console.error('Toggle location share error:', error);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Update location visibility setting
 * PATCH /api/location/visibility
 */
export const updateLocationVisibility = async (req: any, res: Response) => {
  const { locationVisibility } = req.body;

  if (!locationVisibility || !['everyone', 'matches', 'none'].includes(locationVisibility)) {
    return sendError(res, 'locationVisibility must be one of: everyone, matches, none', 'INVALID_VALUE', 400);
  }

  try {
    await query(
      `UPDATE users
       SET location_visibility = $1
       WHERE id = $2`,
      [locationVisibility, req.user.id]
    );

    return sendSuccess(res, 'Location visibility updated', {
      locationVisibility
    });
  } catch (error: any) {
    console.error('Update location visibility error:', error);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get nearby users who are sharing their location
 * GET /api/location/nearby?radius=5&limit=20
 */
export const getNearby = async (req: any, res: Response) => {
  const { radius = 5, limit = 20, matchesOnly = false } = req.query;

  try {
    // Get current user's location first
    const userLocation = await getUserLocationSettings(req.user.id);

    if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
      return sendError(res, 'Your location is not available. Please enable location sharing.', 'LOCATION_UNAVAILABLE', 400);
    }

    let nearbyUsers;
    if (matchesOnly === 'true') {
      nearbyUsers = await getNearbyMatches(
        req.user.id,
        userLocation.latitude,
        userLocation.longitude,
        parseFloat(radius),
        parseInt(limit)
      );
    } else {
      nearbyUsers = await getNearbyUsers(
        req.user.id,
        userLocation.latitude,
        userLocation.longitude,
        parseFloat(radius),
        parseInt(limit)
      );
    }

    // Format response
    const formattedUsers = nearbyUsers.map(user => ({
      id: user.id,
      fullName: user.full_name,
      avatar: user.avatar_url,
      location: {
        latitude: user.latitude,
        longitude: user.longitude,
        accuracy: user.location_accuracy,
        updatedAt: user.location_updated_at
      },
      pet: {
        name: user.pet_name,
        breed: user.pet_breed,
        species: user.pet_species,
        photoUrl: user.pet_photo_url
      },
      distanceKm: parseFloat((user as any).distance_km).toFixed(2)
    }));

    return sendSuccess(res, 'Nearby users retrieved successfully', {
      users: formattedUsers,
      count: formattedUsers.length,
      radiusKm: parseFloat(radius)
    });
  } catch (error: any) {
    console.error('Get nearby users error:', error);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Stop sharing location (clear location data)
 * DELETE /api/location
 */
export const stopSharingLocation = async (req: any, res: Response) => {
  try {
    await clearUserLocation(req.user.id);

    return sendSuccess(res, 'Location sharing stopped. Your location has been cleared.', {
      shareLocation: false,
      locationCleared: true
    });
  } catch (error: any) {
    console.error('Stop sharing location error:', error);
    return sendError(res, 'Server error', error.message, 500);
  }
};

/**
 * Get all users who are sharing their location (for map view)
 * GET /api/location/all
 */
export const getAllSharingLocation = async (req: any, res: Response) => {
  const { limit = 100 } = req.query;

  try {
    const sharingUsers = await getAllLocationSharingUsers(
      req.user.id,
      parseInt(limit)
    );

    // Format response
    const formattedUsers = sharingUsers.map(user => ({
      id: user.id,
      fullName: user.full_name,
      avatar: user.avatar_url,
      location: {
        latitude: user.latitude,
        longitude: user.longitude,
        accuracy: user.location_accuracy,
        updatedAt: user.location_updated_at
      },
      pet: {
        name: user.pet_name,
        breed: user.pet_breed,
        species: user.pet_species,
        photoUrl: user.pet_photo_url
      },
      distanceKm: parseFloat((user as any).distance_km).toFixed(2)
    }));

    return sendSuccess(res, 'All location-sharing users retrieved successfully', {
      users: formattedUsers,
      count: formattedUsers.length
    });
  } catch (error: any) {
    console.error('Get all sharing location error:', error);
    return sendError(res, 'Server error', error.message, 500);
  }
};

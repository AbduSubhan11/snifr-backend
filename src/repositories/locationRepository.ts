import { query } from '../config/db';

export interface LocationData {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  shareLocation: boolean;
  locationVisibility?: 'everyone' | 'matches' | 'none';
}

export interface UserLocation {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  latitude: number;
  longitude: number;
  location_accuracy?: number;
  location_updated_at: string;
  share_location: boolean;
  location_visibility: 'everyone' | 'matches' | 'none';
  pet_name?: string;
  pet_breed?: string;
  pet_species?: 'Dog' | 'Cat';
  pet_photo_url?: string;
}

/**
 * Update user's location settings and coordinates
 */
export const updateUserLocation = async (
  userId: string,
  data: LocationData
): Promise<void> => {
  await query(
    `UPDATE users
     SET latitude = $1,
         longitude = $2,
         location_accuracy = $3,
         share_location = $4,
         location_visibility = $5,
         location_updated_at = NOW()
     WHERE id = $6`,
    [
      data.latitude,
      data.longitude,
      data.accuracy || null,
      data.shareLocation,
      data.locationVisibility || 'matches',
      userId
    ]
  );
};

/**
 * Get user's current location settings
 */
export const getUserLocationSettings = async (
  userId: string
): Promise<{
  share_location: boolean;
  location_visibility: 'everyone' | 'matches' | 'none';
  latitude: number | null;
  longitude: number | null;
  location_updated_at: string | null;
} | null> => {
  const result = await query(
    `SELECT share_location, location_visibility, latitude, longitude, location_updated_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
};

/**
 * Get nearby users who are sharing their location
 * Returns users within specified radius (in kilometers)
 */
export const getNearbyUsers = async (
  userId: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  limit: number = 20
): Promise<UserLocation[]> => {
  // Haversine formula for distance calculation
  const result = await query(
    `SELECT
       u.id,
       u.email,
       u.full_name,
       u.avatar_url,
       u.latitude,
       u.longitude,
       u.location_accuracy,
       u.location_updated_at,
       u.share_location,
       u.location_visibility,
       p.name as pet_name,
       p.breed as pet_breed,
       p.species as pet_species,
       p.photo_url as pet_photo_url,
       (6371 * acos(
         cos(radians($1)) *
         cos(radians(u.latitude)) *
         cos(radians(u.longitude) - radians($2)) +
         sin(radians($1)) *
         sin(radians(u.latitude))
       )) as distance_km
     FROM users u
     LEFT JOIN pets p ON u.id = p.user_id AND p.is_active = TRUE
     WHERE u.id != $3
       AND u.share_location = TRUE
       AND u.location_visibility IN ('everyone', 'matches')
       AND u.is_active = TRUE
       AND u.latitude IS NOT NULL
       AND u.longitude IS NOT NULL
       AND (6371 * acos(
         cos(radians($1)) *
         cos(radians(u.latitude)) *
         cos(radians(u.longitude) - radians($2)) +
         sin(radians($1)) *
         sin(radians(u.latitude))
       )) <= $4
     ORDER BY distance_km
     LIMIT $5`,
    [latitude, longitude, userId, radiusKm, limit]
  );

  return result.rows;
};

/**
 * Get nearby users for matches only (users who have matched with the current user's pets)
 */
export const getNearbyMatches = async (
  userId: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  limit: number = 20
): Promise<UserLocation[]> => {
  const result = await query(
    `SELECT DISTINCT ON (u.id)
       u.id,
       u.email,
       u.full_name,
       u.avatar_url,
       u.latitude,
       u.longitude,
       u.location_accuracy,
       u.location_updated_at,
       u.share_location,
       u.location_visibility,
       p.name as pet_name,
       p.breed as pet_breed,
       p.species as pet_species,
       p.photo_url as pet_photo_url,
       (6371 * acos(
         cos(radians($1)) * 
         cos(radians(u.latitude)) * 
         cos(radians(u.longitude) - radians($2)) + 
         sin(radians($1)) * 
         sin(radians(u.latitude))
       )) as distance_km
     FROM users u
     LEFT JOIN pets p ON u.id = p.user_id AND p.is_active = TRUE
     INNER JOIN matches m ON (
       (p.id = m.pet_1_id OR p.id = m.pet_2_id)
       AND m.status = 'matched'
     )
     INNER JOIN pets current_user_pets ON (
       (current_user_pets.id = m.pet_1_id OR current_user_pets.id = m.pet_2_id)
       AND current_user_pets.user_id = $3
     )
     WHERE u.id != $3
       AND u.share_location = TRUE
       AND u.is_active = TRUE
       AND u.latitude IS NOT NULL
       AND u.longitude IS NOT NULL
       AND (6371 * acos(
         cos(radians($1)) * 
         cos(radians(u.latitude)) * 
         cos(radians(u.longitude) - radians($2)) + 
         sin(radians($1)) * 
         sin(radians(u.latitude))
       )) <= $4
     ORDER BY u.id, distance_km
     LIMIT $5`,
    [latitude, longitude, userId, radiusKm, limit]
  );

  return result.rows;
};

/**
 * Clear user's location (set to null)
 */
export const clearUserLocation = async (
  userId: string
): Promise<void> => {
  await query(
    `UPDATE users
     SET latitude = NULL,
         longitude = NULL,
         location_accuracy = NULL,
         location_updated_at = NULL
     WHERE id = $1`,
    [userId]
  );
};

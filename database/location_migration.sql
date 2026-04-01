-- ============================================
-- Location Services Migration - Add location sharing fields to users table
-- ============================================

-- Add location sharing preference and real-time location tracking fields
ALTER TABLE users
ADD COLUMN IF NOT EXISTS share_location BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS location_visibility VARCHAR(50) DEFAULT 'matches' CHECK (location_visibility IN ('everyone', 'matches', 'none'));

-- Create index for location-based queries (nearby pets)
CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude) WHERE share_location = TRUE AND is_active = TRUE;

-- ============================================
-- Playdates Table - MVP Feature 3
-- ============================================
-- Stores playdate requests and scheduled meetups
-- Users can schedule playdates at parks with time/date

CREATE TABLE IF NOT EXISTS playdates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  invited_pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  
  -- Playdate Details
  title VARCHAR(150) NOT NULL,
  location_name VARCHAR(200) NOT NULL, -- e.g., "F9 Park", "Lake View Park"
  location_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60, -- Default 1 hour
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  message TEXT,
  declined_reason VARCHAR(255),
  
  -- Timestamps
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_playdates_match_id ON playdates(match_id);
CREATE INDEX IF NOT EXISTS idx_playdates_pet_id ON playdates(pet_id);
CREATE INDEX IF NOT EXISTS idx_playdates_invited_pet ON playdates(invited_pet_id);
CREATE INDEX IF NOT EXISTS idx_playdates_status ON playdates(status);
CREATE INDEX IF NOT EXISTS idx_playdates_scheduled_date ON playdates(scheduled_date);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_playdates_pet_status ON playdates(pet_id, status);
CREATE INDEX IF NOT EXISTS idx_playdates_date_status ON playdates(scheduled_date, status);

-- Comment for documentation
COMMENT ON TABLE playdates IS 'Stores playdate requests and scheduled pet meetups';
COMMENT ON COLUMN playdates.status IS 'pending: awaiting response, accepted: confirmed, declined: rejected, completed: meetup happened, cancelled: cancelled by either party';

-- ============================================
-- Popular Parks in Islamabad (Seed Data)
-- ============================================
-- You can use this as a reference or create a separate parks table

CREATE TABLE IF NOT EXISTS parks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city VARCHAR(100) DEFAULT 'Islamabad',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_parks_city ON parks(city);
CREATE INDEX IF NOT EXISTS idx_parks_location ON parks(latitude, longitude);

-- Seed popular Islamabad dog parks
INSERT INTO parks (name, address, latitude, longitude) VALUES
('F9 Park', 'F-9 Markaz, Islamabad', 33.7294, 73.0386),
('Lake View Park', 'Expressway, Islamabad', 33.6844, 73.0594),
('Margalla Trail 3', 'Margalla Hills, Islamabad', 33.7361, 73.0619),
('DHA Phase 2 Dog Park', 'DHA Phase 2, Islamabad', 33.6428, 73.0478),
('Fatima Jinnah Park', 'F-9, Islamabad', 33.7308, 73.0400),
('Rose Garden Park', 'F-9, Islamabad', 33.7250, 73.0450)
ON CONFLICT DO NOTHING;

-- ============================================
-- Matches Table - MVP Feature 2 (Swipe Matching)
-- ============================================

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_1_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  pet_2_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  pet_1_liked BOOLEAN DEFAULT FALSE,
  pet_2_liked BOOLEAN DEFAULT FALSE,
  pet_1_disliked BOOLEAN DEFAULT FALSE,
  pet_2_disliked BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'rejected', 'unmatched')),
  liked_at TIMESTAMP WITH TIME ZONE,
  matched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_pet_pair UNIQUE (pet_1_id, pet_2_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_pet_1 ON matches(pet_1_id);
CREATE INDEX IF NOT EXISTS idx_matches_pet_2 ON matches(pet_2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_matched_at ON matches(matched_at);
CREATE INDEX IF NOT EXISTS idx_matches_pet_status ON matches(pet_1_id, status);

COMMENT ON TABLE matches IS 'Stores swipe matching between pets for playdate connections';

-- ============================================
-- Playdates Table - MVP Feature 3
-- ============================================

CREATE TABLE IF NOT EXISTS playdates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  invited_pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  
  -- Playdate Details
  title VARCHAR(150) NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  location_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  
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

CREATE INDEX IF NOT EXISTS idx_playdates_match_id ON playdates(match_id);
CREATE INDEX IF NOT EXISTS idx_playdates_pet_id ON playdates(pet_id);
CREATE INDEX IF NOT EXISTS idx_playdates_invited_pet ON playdates(invited_pet_id);
CREATE INDEX IF NOT EXISTS idx_playdates_status ON playdates(status);
CREATE INDEX IF NOT EXISTS idx_playdates_scheduled_date ON playdates(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_playdates_pet_status ON playdates(pet_id, status);
CREATE INDEX IF NOT EXISTS idx_playdates_date_status ON playdates(scheduled_date, status);

COMMENT ON TABLE playdates IS 'Stores playdate requests and scheduled pet meetups';

-- ============================================
-- Matches Table - MVP Feature 2
-- ============================================
-- Stores swipe matching between pets
-- When two pet owners both like each other → it's a match

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  
  -- Ensure unique pair (no duplicate matches between same pets)
  CONSTRAINT unique_pet_pair UNIQUE (pet_1_id, pet_2_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_matches_pet_1 ON matches(pet_1_id);
CREATE INDEX IF NOT EXISTS idx_matches_pet_2 ON matches(pet_2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_matched_at ON matches(matched_at);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_matches_pet_status ON matches(pet_1_id, status);

-- Comment for documentation
COMMENT ON TABLE matches IS 'Stores swipe matching between pets for playdate connections';

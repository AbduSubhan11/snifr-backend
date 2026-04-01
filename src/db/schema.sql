CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Pets Table - MVP Feature 1
-- ============================================
CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  breed VARCHAR(100) NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female')),
  species VARCHAR(50) NOT NULL DEFAULT 'Dog' CHECK (species IN ('Dog', 'Cat')),
  temperament VARCHAR(255),
  energy_level VARCHAR(50) CHECK (energy_level IN ('Low', 'Medium', 'High')),
  weight DECIMAL(5,2),
  color VARCHAR(50),
  bio TEXT,
  photo_url VARCHAR(500),
  photo_public_id VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  vaccination_status BOOLEAN DEFAULT FALSE,
  compatibility_score INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);
CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed);
CREATE INDEX IF NOT EXISTS idx_pets_age ON pets(age);
CREATE INDEX IF NOT EXISTS idx_pets_gender ON pets(gender);
CREATE INDEX IF NOT EXISTS idx_pets_energy_level ON pets(energy_level);
CREATE INDEX IF NOT EXISTS idx_pets_is_active ON pets(is_active);
CREATE INDEX IF NOT EXISTS idx_pets_user_active ON pets(user_id, is_active);

-- ============================================
-- Matches Table - MVP Feature 2
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

-- ============================================
-- Playdates Table - MVP Feature 3
-- ============================================
CREATE TABLE IF NOT EXISTS playdates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  invited_pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  location_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  message TEXT,
  declined_reason VARCHAR(255),
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

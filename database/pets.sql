-- ============================================
-- Pets Table - MVP Feature
-- ============================================
-- Stores pet profiles for the Snifr app
-- Each user can create multiple pet profiles
-- Each pet can have ONLY 1 photo

CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  breed VARCHAR(100) NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female')),
  species VARCHAR(50) NOT NULL DEFAULT 'Dog' CHECK (species IN ('Dog', 'Cat')),
  temperament VARCHAR(255),
  energy_level VARCHAR(50) CHECK (energy_level IN ('Low', 'Medium', 'High')),
  weight DECIMAL(5,2), -- in kg
  color VARCHAR(50),
  bio TEXT,
  photo_url VARCHAR(500), -- Single photo URL (Cloudinary)
  photo_public_id VARCHAR(255), -- Cloudinary public ID for deletion
  is_verified BOOLEAN DEFAULT FALSE,
  vaccination_status BOOLEAN DEFAULT FALSE,
  compatibility_score INTEGER DEFAULT 50, -- 0-100 score for matching
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user-based queries (each user sees only their pets)
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);

-- Index for filtering by species, breed, and age
CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);
CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed);
CREATE INDEX IF NOT EXISTS idx_pets_age ON pets(age);
CREATE INDEX IF NOT EXISTS idx_pets_gender ON pets(gender);
CREATE INDEX IF NOT EXISTS idx_pets_energy_level ON pets(energy_level);
CREATE INDEX IF NOT EXISTS idx_pets_is_active ON pets(is_active);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_pets_user_active ON pets(user_id, is_active);

-- Comment for documentation
COMMENT ON TABLE pets IS 'Stores pet profiles for users (dogs and cats)';
COMMENT ON COLUMN pets.compatibility_score IS 'AI-based compatibility score for matching with other pets';
COMMENT ON COLUMN pets.is_verified IS 'Indicates if pet has verified vaccination/vet proof';

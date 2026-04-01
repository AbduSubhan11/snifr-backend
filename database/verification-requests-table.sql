-- ============================================
-- Pet Verification Requests Table
-- For document-based verification system
-- ============================================

CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Document uploads
  document_url VARCHAR(500) NOT NULL,
  document_public_id VARCHAR(255) NOT NULL,
  document_type VARCHAR(50) NOT NULL DEFAULT 'vaccination_certificate' 
    CHECK (document_type IN ('vaccination_certificate', 'vet_certificate', 'medical_record')),
  
  -- Additional info
  notes TEXT,
  
  -- Verification status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Admin review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_pet_id ON verification_requests(pet_id);
CREATE INDEX IF NOT EXISTS idx_verification_user_id ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_created_at ON verification_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_verification_pet_status ON verification_requests(pet_id, status);

-- Add admin role column to users table (if not exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create at least one admin user (you can change this email)
-- UPDATE users SET is_admin = TRUE WHERE email = 'admin@snifr.com';

COMMENT ON TABLE verification_requests IS 'Stores pet verification document submissions and their approval status';
COMMENT ON COLUMN verification_requests.document_type IS 'Type of document: vaccination_certificate, vet_certificate, or medical_record';
COMMENT ON COLUMN verification_requests.status IS 'pending = awaiting review, approved = verified badge shown, rejected = not approved';
COMMENT ON COLUMN verification_requests.rejection_reason IS 'Reason provided by admin when rejecting verification';

-- Add vaccination document columns to pets table
ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS vaccination_document_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS vaccination_document_public_id VARCHAR(255);

COMMENT ON COLUMN pets.vaccination_document_url IS 'Cloudinary URL for uploaded vaccination document';
COMMENT ON COLUMN pets.vaccination_document_public_id IS 'Cloudinary public ID for vaccination document';

-- Migration: Add clerk_user_id column to analyses table
-- Non-destructive: column is NULL by default, existing records work unchanged

-- Safety check: only add if column doesn't exist (idempotent)
SET @column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'analyses'
    AND COLUMN_NAME = 'clerk_user_id'
);

-- Add the nullable clerk_user_id column
-- This column will store the Clerk user ID when a user is authenticated
-- For anonymous audits, it remains NULL
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(64) NULL
  AFTER ip_address;

-- Add index for faster lookups when we query audits by user
-- Only create if index doesn't exist
SET @index_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'analyses'
    AND INDEX_NAME = 'idx_analyses_clerk_user_id'
);

CREATE INDEX IF NOT EXISTS idx_analyses_clerk_user_id ON analyses (clerk_user_id);

-- Verify the column was added
DESCRIBE analyses;

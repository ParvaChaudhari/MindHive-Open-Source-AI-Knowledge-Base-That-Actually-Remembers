-- 01_summary_caching.sql
-- Step 1: Add summary caching columns and duplicate guard index

-- 1. Add summary caching columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMPTZ;

-- 2. Index on (user_id, name) for faster duplicate-upload checks
CREATE INDEX IF NOT EXISTS idx_documents_user_name ON documents (user_id, name);

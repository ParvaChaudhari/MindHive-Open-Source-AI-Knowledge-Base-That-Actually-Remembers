-- =============================================================
-- MindHive — Phase 4 Migration
-- Run this in your Supabase SQL editor
-- =============================================================

-- 1. Add `description` column to collections table (if not exists)
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS description text;

-- 2. Ensure `collection_id` FK exists on documents table (if not exists)
-- (already in schema per roadmap, this is a safety check)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES collections(id) ON DELETE SET NULL;


-- =============================================================
-- 3. Create the cross-document similarity search RPC
--    Called by: match_chunks_in_collection(query_embedding, match_collection_id, match_count)
--    Returns:   chunks with their content, doc_id, doc_name, page_number, similarity score
-- =============================================================

CREATE OR REPLACE FUNCTION match_chunks_in_collection(
  query_embedding vector(768),
  match_collection_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  doc_id uuid,
  doc_name text,
  content text,
  page_number int,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.doc_id,
    d.name AS doc_name,
    c.content,
    c.page_number,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  JOIN documents d ON d.id = c.doc_id
  WHERE d.collection_id = match_collection_id
    AND d.status = 'ready'
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;


-- =============================================================
-- 4. Grant RPC execute permissions (needed for anon/service key)
-- =============================================================

GRANT EXECUTE ON FUNCTION match_chunks_in_collection(vector, uuid, int)
  TO anon, authenticated, service_role;


-- =============================================================
-- Verification queries (run after migration to confirm it works)
-- =============================================================

-- Check collections table structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'collections';

-- Check documents has collection_id:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'collection_id';

-- Check the function exists:
-- SELECT routine_name FROM information_schema.routines WHERE routine_name = 'match_chunks_in_collection';

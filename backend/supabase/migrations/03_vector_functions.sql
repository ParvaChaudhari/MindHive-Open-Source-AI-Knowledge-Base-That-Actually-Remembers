-- 03_vector_functions.sql
-- Vector search functions for cross-document queries

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_chunks_in_collection(vector, uuid, int)
  TO anon, authenticated, service_role;

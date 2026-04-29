-- 00_initial_schema.sql
-- Initial MindHive Schema

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Collections Table
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'processing', -- 'processing', 'ready', 'error'
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Chunks Table (Vector Storage)
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    page_number INT,
    embedding VECTOR(768), -- Gemini 768-dim embeddings
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Basic setup, assuming it will be hardened)
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

-- Simple "User can only see their own data" policies
CREATE POLICY "Users can see their own collections" ON collections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see their own documents" ON documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see chunks of their own documents" ON chunks FOR ALL 
    USING (EXISTS (SELECT 1 FROM documents WHERE id = chunks.doc_id AND user_id = auth.uid()));

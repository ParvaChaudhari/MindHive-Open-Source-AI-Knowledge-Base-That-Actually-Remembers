-- Phase 6: Auth & RLS Migration

-- 1. Add user_id to collections
ALTER TABLE collections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Add user_id to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 3. Enable RLS on collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- 4. Policies for collections
CREATE POLICY "Users can view their own collections" 
ON collections FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections" 
ON collections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" 
ON collections FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" 
ON collections FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Enable RLS on documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 6. Policies for documents
CREATE POLICY "Users can view their own documents" 
ON documents FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" 
ON documents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON documents FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON documents FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Enable RLS on chunks (cascades from documents)
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

-- Chunks are tricky because they don't have a direct user_id, 
-- but we can join with documents to verify ownership.
CREATE POLICY "Users can view chunks of their own documents" 
ON chunks FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = chunks.doc_id 
    AND documents.user_id = auth.uid()
  )
);

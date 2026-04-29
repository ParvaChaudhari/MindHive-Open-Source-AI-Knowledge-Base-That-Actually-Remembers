-- 04_rls_hardening.sql
-- Hardened RLS policies for collections, documents, and chunks

-- 1. Policies for collections
CREATE POLICY "Users can create their own collections" 
ON collections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" 
ON collections FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" 
ON collections FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Policies for documents
CREATE POLICY "Users can create their own documents" 
ON documents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
ON documents FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
ON documents FOR DELETE 
USING (auth.uid() = user_id);

-- 3. Hardened policy for chunks
-- Already exists in 00_initial_schema as a simple select, but this is a reminder
-- that chunks are strictly tied to document ownership.

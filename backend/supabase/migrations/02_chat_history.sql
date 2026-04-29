-- 02_chat_history.sql
-- Step 3: Chat History & Summary Tables

-- 1. Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create chat_summaries table
CREATE TABLE IF NOT EXISTS chat_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    message_count INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_chats_doc_user ON chats(doc_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_summaries_doc_user ON chat_summaries(doc_id, user_id);

-- 4. Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_summaries ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Users can see their own chats" ON chats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can see their own chat summaries" ON chat_summaries FOR ALL USING (auth.uid() = user_id);

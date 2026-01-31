-- Create interactions table for Cheer feature
CREATE TABLE IF NOT EXISTS interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id),
    receiver_id UUID REFERENCES profiles(id),
    type TEXT NOT NULL, -- 'cheer', 'checkin'
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view interactions they sent or received
DROP POLICY IF EXISTS "Users can view own interactions" ON interactions;
CREATE POLICY "Users can view own interactions" ON interactions
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Authenticated users can insert (send) interactions
DROP POLICY IF EXISTS "Users can insert interactions" ON interactions;
CREATE POLICY "Users can insert interactions" ON interactions
    FOR INSERT WITH CHECK (auth.uid() = sender_id);
    
-- Policy: Receiver can update read status
DROP POLICY IF EXISTS "Receiver can update read status" ON interactions;
CREATE POLICY "Receiver can update read status" ON interactions
    FOR UPDATE USING (auth.uid() = receiver_id);

-- Create a realtime publication for interactions to enable live updates
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE interactions;

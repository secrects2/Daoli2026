
-- 1. Create match_participants table
CREATE TABLE IF NOT EXISTS match_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    elder_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    team TEXT CHECK (team IN ('red', 'yellow')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, elder_id) -- Prevent same elder in same match twice
);

-- 2. Enable RLS
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;

-- 3. Policies (Simple: Pharmacists/Admin can do everything, Family/Elders view only if involved)
-- For now, open to authenticated users for simplicity in reading, mostly server-side driven or pharmacist
CREATE POLICY "Pharmacists can manage match participants" ON match_participants
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('pharmacist', 'admin')
        )
    );

CREATE POLICY "Elders can view their own match participation" ON match_participants
    FOR SELECT
    USING (
        elder_id = auth.uid()
    );

-- 4. Modify matches table to allow NULL for single-elder columns
-- We keep them for backward compatibility or as "primary" elder if needed, but make nullable
ALTER TABLE matches ALTER COLUMN red_team_elder_id DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN yellow_team_elder_id DROP NOT NULL;

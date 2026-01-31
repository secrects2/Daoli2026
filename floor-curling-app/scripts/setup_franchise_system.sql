-- Protocol: Franchise Control System (Store Locking Mechanism)

-- Step 1: Create Stores Table
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY, -- Specific Store ID like 'TPE-XINYI'
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'terminated')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure profiles references stores if not already
-- Note: profiles.store_id is currently TEXT. We add a FK constraint.
-- If store_id in profiles has values that don't exist in stores, this might fail unless we populate stores first.
-- For this script, we assume the user might need to populate stores manually or we insert a default 'TPE-XINYI' if needed.
-- Let's try to add the constraint safely.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_store_id_fkey') THEN
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_store_id_fkey
        FOREIGN KEY (store_id)
        REFERENCES stores(id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint creation might have failed due to missing data. Ensure valid store IDs exist first.';
END $$;

-- Enable RLS on stores
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (or authenticated) so profiles can see their store status
CREATE POLICY "Stores are viewable by everyone" ON stores
    FOR SELECT USING (true);
    
-- Only Service Role (Admin) can insert/update stores initially
-- (No specific policy needed for Service Role as it bypasses RLS, but for clarity:)
-- CREATE POLICY "Admins can manage stores" ON stores ...

-- Step 2: Helper Function
CREATE OR REPLACE FUNCTION is_store_active(p_store_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status TEXT;
BEGIN
    IF p_store_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT status INTO v_status FROM stores WHERE id = p_store_id;
    
    RETURN v_status = 'active';
END;
$$;

-- Step 3: RLS Updates (The Kill Switch - Client Side Prevention)
-- Block INSERT/UPDATE on matches/transactions/etc if store is not active.
-- Note: This affects direct client access using Supabase Client.

-- Policy for MATCHES
-- Drop existing policies if they conflict or create new blocking ones using WITH CHECK?
-- It's easier to add a check to existing or new policies.
-- Let's assume we want to enforce: "Users can only insert if their store is active"

CREATE POLICY "Active store members can insert matches" ON matches
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE store_id IN (SELECT id FROM stores WHERE status = 'active')
        )
    );

-- Step 4: Update RPC (The Kill Switch - Server Side/Admin Prevention)
-- We explicitly RECREATE the function with the check added at the top.

CREATE OR REPLACE FUNCTION calculate_and_record_match_result(
    p_store_id TEXT, -- Changed from UUID to TEXT to match stores table
    p_red_elder_id UUID,
    p_yellow_elder_id UUID,
    p_ends JSONB,
    p_operator_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- ... vars ...
    v_match_id UUID;
    v_red_total INT := 0;
    v_yellow_total INT := 0;
    v_winner_color TEXT;
    v_winner_id UUID;
    v_loser_id UUID;
    v_evidence_url TEXT;
    v_end_record JSONB;
    v_store_status TEXT;
BEGIN
    -- [KILL SWITCH] Check Store Status
    SELECT status INTO v_store_status FROM stores WHERE id = p_store_id;
    
    IF v_store_status IS NULL THEN
        RAISE EXCEPTION 'Store ID not found: %', p_store_id;
    END IF;
    
    IF v_store_status != 'active' THEN
        RAISE EXCEPTION 'Store is % (Not Active). Operation refused.', v_store_status;
    END IF;

    -- ... Original Logic Below ...
    
    -- 1. Create Match Record
    INSERT INTO matches (store_id, red_team_elder_id, yellow_team_elder_id, status, created_at)
    VALUES (p_store_id, p_red_elder_id, p_yellow_elder_id, 'in_progress', NOW())
    RETURNING id INTO v_match_id;

    -- 2. Process Ends
    FOR v_end_record IN SELECT * FROM jsonb_array_elements(p_ends)
    LOOP
        INSERT INTO match_ends (
            match_id, 
            end_number, 
            red_score, 
            yellow_score, 
            house_snapshot_url, 
            vibe_video_url
        )
        VALUES (
            v_match_id,
            (v_end_record->>'endNumber')::INT,
            (v_end_record->>'redScore')::INT,
            (v_end_record->>'yellowScore')::INT,
            v_end_record->>'houseSnapshotUrl',
            v_end_record->>'vibeVideoUrl'
        );

        v_red_total := v_red_total + (v_end_record->>'redScore')::INT;
        v_yellow_total := v_yellow_total + (v_end_record->>'yellowScore')::INT;
        
        IF v_evidence_url IS NULL THEN
            v_evidence_url := v_end_record->>'houseSnapshotUrl';
        END IF;
    END LOOP;

    -- 3. Determine Winner
    IF v_red_total > v_yellow_total THEN
        v_winner_color := 'red';
        v_winner_id := p_red_elder_id;
        v_loser_id := p_yellow_elder_id;
    ELSIF v_yellow_total > v_red_total THEN
        v_winner_color := 'yellow';
        v_winner_id := p_yellow_elder_id;
        v_loser_id := p_red_elder_id;
    ELSE
        v_winner_color := NULL;
        v_winner_id := NULL;
        v_loser_id := NULL;
    END IF;

    -- 4. Update Match Status
    UPDATE matches
    SET 
        winner_color = v_winner_color,
        status = 'completed',
        completed_at = NOW()
    WHERE id = v_match_id;

    -- 5. Wallet & Transaction Logic
    IF v_winner_color = 'red' THEN
        PERFORM update_player_wallet(p_red_elder_id, 100, 50, 'match_win', v_match_id, p_store_id, v_evidence_url, format('比賽勝利獎勵 (%s:%s)', v_red_total, v_yellow_total));
    ELSE
        PERFORM update_player_wallet(p_red_elder_id, 10, 5, 'match_participate', v_match_id, p_store_id, v_evidence_url, format('比賽參與獎勵 (%s:%s)', v_red_total, v_yellow_total));
    END IF;

    IF v_winner_color = 'yellow' THEN
         PERFORM update_player_wallet(p_yellow_elder_id, 100, 50, 'match_win', v_match_id, p_store_id, v_evidence_url, format('比賽勝利獎勵 (%s:%s)', v_red_total, v_yellow_total));
    ELSE
         PERFORM update_player_wallet(p_yellow_elder_id, 10, 5, 'match_participate', v_match_id, p_store_id, v_evidence_url, format('比賽參與獎勵 (%s:%s)', v_red_total, v_yellow_total));
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'match_id', v_match_id,
        'red_total', v_red_total,
        'yellow_total', v_yellow_total,
        'winner_color', v_winner_color,
        'winner_id', v_winner_id
    );
END;
$$;

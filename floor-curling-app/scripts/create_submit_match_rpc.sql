-- Protocol Decoupling Migration
-- Logic: Move match calculation and point transaction logic from API to Database Function

CREATE OR REPLACE FUNCTION calculate_and_record_match_result(
    p_store_id UUID,
    p_red_elder_id UUID,
    p_yellow_elder_id UUID,
    p_ends JSONB, -- Array of {endNumber, redScore, yellowScore, houseSnapshotUrl, vibeVideoUrl}
    p_operator_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run with owner privileges to bypass RLS for transaction logic if needed, or ensuring consistency
AS $$
DECLARE
    v_match_id UUID;
    v_red_total INT := 0;
    v_yellow_total INT := 0;
    v_winner_color TEXT;
    v_winner_id UUID;
    v_loser_id UUID;
    v_evidence_url TEXT;
    v_end_record JSONB;
    v_wallet_exists BOOLEAN;
    v_current_global INT;
    v_current_local INT;
    v_new_global INT;
    v_new_local INT;
    v_points_config JSONB;
BEGIN
    -- 1. Create Match Record (In Progress -> Completed directly as we are submitting result)
    INSERT INTO matches (store_id, red_team_elder_id, yellow_team_elder_id, status, created_at)
    VALUES (p_store_id, p_red_elder_id, p_yellow_elder_id, 'in_progress', NOW())
    RETURNING id INTO v_match_id;

    -- 2. Process Ends and Calculate Totals
    -- p_ends is expected to be a JSON array
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
            v_end_record->>'vibeVideoUrl' -- Can be null
        );

        v_red_total := v_red_total + (v_end_record->>'redScore')::INT;
        v_yellow_total := v_yellow_total + (v_end_record->>'yellowScore')::INT;
        
        -- Capture first evidence for transaction log
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
        v_winner_color := NULL; -- Draw
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
    -- Define Points Config (Can be moved to a settings table later)
    -- Winner: +100 Global, +50 Local
    -- Loser: +10 Global, +5 Local
    -- Draw: Both get Loser rewards (Participate)
    
    -- Helper Logic for Updating Wallet
    -- We will do this via a small internal block or just inline since we do it twice
    
    -- Handle Red Player Points
    IF v_winner_color = 'red' THEN
        PERFORM update_player_wallet(p_red_elder_id, 100, 50, 'match_win', v_match_id, p_store_id, v_evidence_url, format('比賽勝利獎勵 (%s:%s)', v_red_total, v_yellow_total));
    ELSE
        -- Loser or Draw (Participate)
        PERFORM update_player_wallet(p_red_elder_id, 10, 5, 'match_participate', v_match_id, p_store_id, v_evidence_url, format('比賽參與獎勵 (%s:%s)', v_red_total, v_yellow_total));
    END IF;

    -- Handle Yellow Player Points
    IF v_winner_color = 'yellow' THEN
         PERFORM update_player_wallet(p_yellow_elder_id, 100, 50, 'match_win', v_match_id, p_store_id, v_evidence_url, format('比賽勝利獎勵 (%s:%s)', v_red_total, v_yellow_total));
    ELSE
         PERFORM update_player_wallet(p_yellow_elder_id, 10, 5, 'match_participate', v_match_id, p_store_id, v_evidence_url, format('比賽參與獎勵 (%s:%s)', v_red_total, v_yellow_total));
    END IF;

    -- Return Result
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

-- Helper Function to avoid code duplication
CREATE OR REPLACE FUNCTION update_player_wallet(
    p_user_id UUID,
    p_global_delta INT,
    p_local_delta INT,
    p_type TEXT,
    p_match_id UUID,
    p_store_id UUID,
    p_evidence_url TEXT,
    p_description TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_global INT;
    v_current_local INT;
    v_new_global INT;
    v_new_local INT;
BEGIN
    -- Check if wallet exists
    SELECT global_points, local_points INTO v_current_global, v_current_local
    FROM wallets WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        v_current_global := 0;
        v_current_local := 0;
        INSERT INTO wallets (user_id, global_points, local_points)
        VALUES (p_user_id, p_global_delta, p_local_delta);
        v_new_global := p_global_delta;
        v_new_local := p_local_delta;
    ELSE
        v_new_global := v_current_global + p_global_delta;
        v_new_local := v_current_local + p_local_delta;
        UPDATE wallets
        SET global_points = v_new_global, local_points = v_new_local
        WHERE user_id = p_user_id;
    END IF;

    -- Insert Transaction
    INSERT INTO transactions (
        user_id,
        type,
        global_points_delta,
        local_points_delta,
        global_points_after,
        local_points_after,
        match_id,
        store_id,
        operator_role,
        description,
        evidence_url,
        created_at
    ) VALUES (
        p_user_id,
        p_type,
        p_global_delta,
        p_local_delta,
        v_new_global,
        v_new_local,
        p_match_id,
        p_store_id,
        'system',
        p_description,
        p_evidence_url,
        NOW()
    );
END;
$$;

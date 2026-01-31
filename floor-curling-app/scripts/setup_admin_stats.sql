-- Admin Global Stats RPC
-- This function aggregates data for the Admin Dashboard "God Mode" view.

CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_matches INT;
    v_today_matches INT;
    v_active_elders_weekly INT;
    v_total_points_distributed INT;
    v_top_stores JSONB;
BEGIN
    -- 1. Total Matches (Completed)
    SELECT COUNT(*) INTO v_total_matches
    FROM matches
    WHERE status = 'completed';

    -- 2. Today's Matches (Completed since midnight)
    SELECT COUNT(*) INTO v_today_matches
    FROM matches
    WHERE status = 'completed'
      AND completed_at >= CURRENT_DATE;

    -- 3. Active Elders (Participated in a match in last 7 days)
    SELECT COUNT(DISTINCT player_id) INTO v_active_elders_weekly
    FROM (
        SELECT red_team_elder_id as player_id FROM matches WHERE created_at >= NOW() - INTERVAL '7 days'
        UNION
        SELECT yellow_team_elder_id as player_id FROM matches WHERE created_at >= NOW() - INTERVAL '7 days'
    ) as combined_players;

    -- 4. Total Points (Global Points in wallets)
    -- This gives a sense of "inflation" or total economy size
    SELECT COALESCE(SUM(global_points), 0) INTO v_total_points_distributed
    FROM wallets;

    -- 5. Top 5 Stores by Completed Matches
    SELECT jsonb_agg(t) INTO v_top_stores
    FROM (
        SELECT s.name, COUNT(m.id) as match_count
        FROM matches m
        JOIN stores s ON m.store_id = s.id
        WHERE m.status = 'completed'
        GROUP BY s.id, s.name
        ORDER BY match_count DESC
        LIMIT 5
    ) t;

    -- Return Consolidated JSON
    RETURN jsonb_build_object(
        'total_matches', v_total_matches,
        'today_matches', v_today_matches,
        'active_elders_weekly', v_active_elders_weekly,
        'total_points_distributed', v_total_points_distributed,
        'top_stores', COALESCE(v_top_stores, '[]'::jsonb)
    );
END;
$$;

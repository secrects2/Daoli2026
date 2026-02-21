-- 1. Create elder_health_daily table
CREATE TABLE IF NOT EXISTS public.elder_health_daily (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    elder_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    date date NOT NULL,
    steps integer DEFAULT 0,
    heart_rate_avg integer DEFAULT 0,
    calories_burned integer DEFAULT 0,
    active_minutes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(elder_id, date)
);

-- 2. Enable Row Level Security
ALTER TABLE public.elder_health_daily ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own health data" ON public.elder_health_daily;
CREATE POLICY "Users can view their own health data" ON public.elder_health_daily
    FOR SELECT
    USING (
        auth.uid() = elder_id OR 
        EXISTS (
            SELECT 1 FROM family_elder_links 
            WHERE family_elder_links.family_id = auth.uid() 
            AND family_elder_links.elder_id = elder_health_daily.elder_id
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'pharmacist'
        ) OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );


        -- =====================================================
        -- 重置并重建 RLS 策略
        -- =====================================================

        -- 删除现有策略
        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.profiles;
        DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.wallets;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.wallets;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.wallets;
        DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
        DROP POLICY IF EXISTS "Authenticated users can view all wallets" ON public.wallets;

        -- =====================================================
        -- PROFILES 表策略
        -- =====================================================
        
        -- 1. 用户可以查看自己的 profile
        CREATE POLICY "Users can view own profile"
            ON public.profiles FOR SELECT
            TO authenticated
            USING (auth.uid() = id);

        -- 2. 药师可以查看同店铺的长辈 profiles
        CREATE POLICY "Pharmacists can view store elders"
            ON public.profiles FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles AS viewer
                    WHERE viewer.id = auth.uid()
                    AND viewer.role = 'pharmacist'
                    AND viewer.store_id = profiles.store_id
                )
            );

        -- 3. 家属可以查看绑定长辈的 profile
        CREATE POLICY "Family can view linked elder"
            ON public.profiles FOR SELECT
            TO authenticated
            USING (
                linked_family_id = auth.uid()
            );

        -- 4. 允许创建自己的 profile
        CREATE POLICY "Users can insert own profile"
            ON public.profiles FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = id);

        -- 5. 用户可以更新自己的 profile
        CREATE POLICY "Users can update own profile"
            ON public.profiles FOR UPDATE
            TO authenticated
            USING (auth.uid() = id);

        -- =====================================================
        -- WALLETS 表策略 (核心防弊)
        -- =====================================================

        -- 1. 用户可以查看自己的钱包
        CREATE POLICY "Users can view own wallet"
            ON public.wallets FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());

        -- 2. 药师可以查看同店铺长辈的钱包 (只读)
        CREATE POLICY "Pharmacists can view store wallets"
            ON public.wallets FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles AS viewer
                    WHERE viewer.id = auth.uid()
                    AND viewer.role = 'pharmacist'
                    AND EXISTS (
                        SELECT 1 FROM public.profiles AS elder
                        WHERE elder.id = wallets.user_id
                        AND elder.store_id = viewer.store_id
                    )
                )
            );

        -- 3. 禁止前端直接 INSERT/UPDATE wallets (仅后端 service_role 可操作)
        -- 注意：authenticated 用户无法修改，只有 service_role 可以绕过 RLS

        -- =====================================================
        -- MATCHES 表策略
        -- =====================================================

        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.matches;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.matches;
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.matches;

        -- 1. 药师可以查看和创建同店铺的比赛
        CREATE POLICY "Pharmacists can manage store matches"
            ON public.matches FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid()
                    AND role = 'pharmacist'
                    AND store_id = matches.store_id
                )
            );

        -- 2. 参赛者可以查看自己的比赛
        CREATE POLICY "Players can view own matches"
            ON public.matches FOR SELECT
            TO authenticated
            USING (
                red_team_elder_id = auth.uid() OR yellow_team_elder_id = auth.uid()
            );

        -- 3. 家属可以查看绑定长辈的比赛
        CREATE POLICY "Family can view linked matches"
            ON public.matches FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.linked_family_id = auth.uid()
                    AND (profiles.id = matches.red_team_elder_id OR profiles.id = matches.yellow_team_elder_id)
                )
            );

        -- =====================================================
        -- MATCH_ENDS 表策略
        -- =====================================================

        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.match_ends;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.match_ends;

        CREATE POLICY "Users can view match ends"
            ON public.match_ends FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.matches
                    WHERE matches.id = match_ends.match_id
                )
            );

        CREATE POLICY "Pharmacists can insert match ends"
            ON public.match_ends FOR INSERT
            TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.matches m
                    JOIN public.profiles p ON p.id = auth.uid()
                    WHERE m.id = match_ends.match_id
                    AND p.role = 'pharmacist'
                    AND p.store_id = m.store_id
                )
            );
    
-- 修复 RLS 策略，确保用户可以查询自己的 profile

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;

-- 创建新策略：用户可以查看自己的 profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- 创建新策略：用户可以查看所有 profile（用于药师查询长者）
CREATE POLICY "Authenticated users can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- 同样修复 wallets 表
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.wallets;

CREATE POLICY "Users can view own wallet"
    ON public.wallets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can view all wallets"
    ON public.wallets FOR SELECT
    TO authenticated
    USING (true);

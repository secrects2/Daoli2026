-- =====================================================
-- Supabase 存储桶配置
-- 用于地壺球平台的照片和视频存储
-- =====================================================

-- 注意：此脚本在 Supabase Dashboard 的 SQL Editor 中执行

-- 1. 创建 'evidence' 公共存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'evidence',
    'evidence',
    true,  -- 设置为公共，允许未认证用户查看
    52428800,  -- 50MB 文件大小限制
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
);

-- 2. 设置存储对象的 RLS 策略

-- 允许所有人查看证据文件
CREATE POLICY "Anyone can view evidence files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'evidence');

-- 允许认证用户上传文件
CREATE POLICY "Authenticated users can upload evidence"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'evidence' AND
        auth.role() = 'authenticated'
    );

-- 允许药师和管理员删除文件
CREATE POLICY "Pharmacists and admins can delete evidence"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'evidence' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('pharmacist', 'admin')
        )
    );

-- 允许上传者更新自己的文件
CREATE POLICY "Users can update own files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'evidence' AND
        owner = auth.uid()
    )
    WITH CHECK (
        bucket_id = 'evidence' AND
        owner = auth.uid()
    );

-- =====================================================
-- 存储桶使用示例
-- =====================================================

-- JavaScript 上传示例：
/*
// 上传证明照片
const { data, error } = await supabase.storage
    .from('evidence')
    .upload(`match-${matchId}/house-snapshot-end-${endNumber}.jpg`, file, {
        cacheControl: '3600',
        upsert: false
    });

// 获取公共 URL
const { data: { publicUrl } } = supabase.storage
    .from('evidence')
    .getPublicUrl('match-123/house-snapshot-end-1.jpg');

// 上传开心视频
const { data, error } = await supabase.storage
    .from('evidence')
    .upload(`match-${matchId}/vibe-video-end-${endNumber}.mp4`, videoFile, {
        cacheControl: '3600',
        upsert: false
    });
*/

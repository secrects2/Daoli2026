# 地壺球平台数据库架构指南

## 📋 概述

这是一个为「地壺球」(Floor Curling) 平台设计的完整 Supabase PostgreSQL 数据库架构，包含用户管理、积分系统、RPG 装备系统和比赛记录功能。

---

## 🗂️ 数据库结构

### 核心表

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `profiles` | 用户档案（扩展 auth.users） | role, store_id, linked_family_id |
| `wallets` | 双账户积分系统 | global_points, local_points |
| `equipment` | RPG 装备库 | name, stats (JSONB), rarity |
| `inventory` | 用户装备背包 | user_id, equipment_id, is_equipped |
| `matches` | 比赛会话 | red/yellow_team_elder_id, winner_color |
| `match_ends` | 比赛回合详情 | end_number, scores, 照片/视频 URL |

---

## 👥 用户角色系统

### 角色类型

```sql
CREATE TYPE user_role AS ENUM ('admin', 'pharmacist', 'family', 'elder');
```

| 角色 | 权限 | 说明 |
|------|------|------|
| **admin** | 全部管理 | 系统管理员 |
| **pharmacist** | 创建比赛、管理库存 | 药房工作人员 |
| **family** | 查看关联长者的比赛 | 家属 |
| **elder** | 参与比赛、查看自己数据 | 长者玩家 |

---

## 💰 双账户积分系统

### Wallets 表结构

```sql
- global_points (BIGINT): 荣誉积分（全局排行榜）
- local_points (BIGINT): 兑换积分（商店内使用）
```

### 自动创建机制

每当创建新用户档案时，系统会自动创建对应的钱包：

```sql
CREATE TRIGGER create_wallet_on_profile_creation
```

---

## ⚔️ RPG 装备系统

### Equipment 表

装备使用 JSONB 格式存储动态属性：

```json
{
  "speed": 15,
  "control": 10,
  "accuracy": 20
}
```

### 预置装备

系统预置了以下装备：

- **Speed Base** (common) - 速度基座
- **Blocker Base** (rare) - 防守基座
- **Precision Pusher** (epic) - 精准推杆
- **Power Grip** (legendary) - 力量握把

---

## 🎯 比赛系统

### Match 流程

```
1. 药师创建比赛 (matches 表)
   ↓
2. 记录每回合数据 (match_ends 表，最多 6 回合)
   ↓
3. 上传证明照片和开心视频到 Storage
   ↓
4. 完成比赛，设置获胜队伍
```

### Match Ends 结构

每场比赛最多 6 个回合 (ends)：

```sql
- end_number: 1-6
- red_score / yellow_score: 各队得分
- house_snapshot_url: 证明照片 (Proof Photo)
- vibe_video_url: 开心视频 (Happy Video)
```

---

## 🔒 行级安全 (RLS) 策略

### Profiles

- ✅ 用户可查看/更新自己的档案
- ✅ 管理员和药师可查看所有档案
- ✅ 管理员可创建新用户

### Wallets

- ✅ 用户可查看自己的钱包
- ✅ 管理员和药师可更新积分

### Matches

- ✅ 药师可创建比赛
- ✅ 参赛长者、关联家属、管理员可查看
- ✅ 药师可更新比赛状态

### Match Ends

- ✅ 药师可插入回合数据
- ✅ **家属只能查看关联长者的比赛回合** ⭐
- ✅ 药师可更新回合数据

---

## 📁 Storage 存储桶

### Evidence 存储桶

用于存储比赛证据：

```
evidence/
├── match-{uuid}/
│   ├── house-snapshot-end-1.jpg
│   ├── house-snapshot-end-2.jpg
│   ├── vibe-video-end-1.mp4
│   └── vibe-video-end-2.mp4
```

### 上传限制

- 文件大小：最大 50MB
- 允许格式：JPEG, PNG, WebP, MP4, QuickTime
- 公开访问：是（所有人可查看 URL）

---

## 🚀 部署步骤

### 1. 执行主迁移脚本

```bash
# 在 Supabase Dashboard -> SQL Editor 中执行
supabase-migration.sql
```

### 2. 配置存储桶

```bash
# 执行存储桶配置脚本
storage-setup.sql
```

### 3. 验证部署

```sql
-- 检查表是否创建
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 检查 RLS 是否启用
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- 检查存储桶
SELECT * FROM storage.buckets WHERE id = 'evidence';
```

---

## 📊 实用查询

### 获取用户完整信息

```sql
SELECT 
    p.id,
    p.role,
    p.store_id,
    w.global_points,
    w.local_points,
    COUNT(i.id) AS equipment_count
FROM profiles p
LEFT JOIN wallets w ON p.id = w.user_id
LEFT JOIN inventory i ON p.id = i.user_id
WHERE p.id = 'user-uuid'
GROUP BY p.id, w.global_points, w.local_points;
```

### 获取比赛详情

```sql
SELECT 
    m.*,
    p_red.id AS red_elder_name,
    p_yellow.id AS yellow_elder_name,
    ms.red_total_score,
    ms.yellow_total_score
FROM matches m
INNER JOIN profiles p_red ON m.red_team_elder_id = p_red.id
INNER JOIN profiles p_yellow ON m.yellow_team_elder_id = p_yellow.id
INNER JOIN match_statistics ms ON m.id = ms.match_id
WHERE m.id = 'match-uuid';
```

### 获取排行榜

```sql
-- 使用内置函数获取全局积分排行榜前 10 名
SELECT * FROM get_leaderboard('global', 10);

-- 获取本地积分排行榜
SELECT * FROM get_leaderboard('local', 10);
```

---

## 🔧 辅助功能

### 自动时间戳

所有表都配置了自动更新的 `updated_at` 字段：

```sql
CREATE TRIGGER update_[table]_updated_at
```

### 数据完整性约束

- ✅ 防止长者与自己比赛
- ✅ 确保积分不为负数
- ✅ 回合数限制在 1-6 之间
- ✅ 每场比赛的回合号唯一

---

## 📝 JavaScript 使用示例

### 创建比赛

```javascript
const { data, error } = await supabase
    .from('matches')
    .insert({
        store_id: 'store-001',
        red_team_elder_id: 'elder-uuid-1',
        yellow_team_elder_id: 'elder-uuid-2'
    })
    .select()
    .single();
```

### 记录回合得分

```javascript
const { data, error } = await supabase
    .from('match_ends')
    .insert({
        match_id: matchId,
        end_number: 1,
        red_score: 2,
        yellow_score: 1,
        house_snapshot_url: photoUrl,
        vibe_video_url: videoUrl
    });
```

### 上传证明照片

```javascript
const file = event.target.files[0];
const fileName = `match-${matchId}/house-snapshot-end-${endNumber}.jpg`;

const { data, error } = await supabase.storage
    .from('evidence')
    .upload(fileName, file);

// 获取公共 URL
const { data: { publicUrl } } = supabase.storage
    .from('evidence')
    .getPublicUrl(fileName);
```

### 查询家属关联的比赛

```javascript
// 家属只能看到关联长者的比赛（RLS 自动过滤）
const { data, error } = await supabase
    .from('match_ends')
    .select(`
        *,
        matches (
            *,
            red_elder:profiles!red_team_elder_id(*),
            yellow_elder:profiles!yellow_team_elder_id(*)
        )
    `);
```

---

## ⚠️ 注意事项

1. **存储桶创建**：`evidence` 存储桶需要手动在 Dashboard 中创建或使用 `storage-setup.sql`
2. **RLS 测试**：部署后请使用不同角色的用户测试 RLS 策略
3. **索引优化**：已为常用查询字段创建索引
4. **数据验证**：所有关键约束已配置，确保数据完整性

---

## 📚 相关文件

- [supabase-migration.sql](file:///c:/Users/secre/.gemini/antigravity/scratch/supabase-migration.sql) - 主迁移脚本
- [storage-setup.sql](file:///c:/Users/secre/.gemini/antigravity/scratch/storage-setup.sql) - 存储桶配置
- [supabase-config.js](file:///c:/Users/secre/.gemini/antigravity/scratch/supabase-config.js) - JavaScript 客户端配置

---

**架构版本**：1.0  
**创建日期**：2026-01-28  
**作者**：Antigravity AI Assistant
